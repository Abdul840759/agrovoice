import 'dotenv/config'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { fileURLToPath } from 'node:url'
import { connectDatabase, Question, User, toQuestionJSON } from './db.js'
import { processQuestion, resumePending } from './ai/pipeline.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

if (!JWT_SECRET || JWT_SECRET.startsWith('paste-') || JWT_SECRET.length < 32) {
  console.error('Missing JWT_SECRET. Create server/.env and set a long random JWT_SECRET (see README step 3).')
  process.exit(1)
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Optional allowlist for the Vercel frontend. Local development stays open by default.
const allowedOrigin = process.env.CORS_ORIGIN
if (allowedOrigin) {
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    }
    if (req.method === 'OPTIONS') return res.sendStatus(origin === allowedOrigin ? 204 : 403)
    next()
  })
}

// ---------- helpers ----------

// 0803 123 4567, +234 803 123 4567 and 2348031234567 all become 08031234567
function normalizePhone(input = '') {
  const digits = String(input).replace(/\D/g, '')
  return digits.startsWith('234') ? '0' + digits.slice(3) : digits
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })
}

// Runs before any route that needs a logged-in user.
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Please log in.' })
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id
    next()
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

// A 6-digit PIN is easy to guess, so lock a phone number after 5 wrong tries for 15 minutes.
const attempts = new Map() // phone -> { count, resetAt }
function tooManyAttempts(phone) {
  const a = attempts.get(phone)
  return Boolean(a && a.resetAt > Date.now() && a.count >= 5)
}
function recordFailure(phone) {
  const now = Date.now()
  const a = attempts.get(phone)
  if (!a || a.resetAt <= now) attempts.set(phone, { count: 1, resetAt: now + 15 * 60 * 1000 })
  else a.count += 1
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

async function sendVerificationEmail(email, code) {
  const apiKey = process.env.BREVO_API_KEY
  const sender = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !sender) throw new Error('Email verification is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL.')
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: sender, name: process.env.BREVO_SENDER_NAME || 'AgroVoice' },
      to: [{ email }],
      subject: 'Your AgroVoice verification code',
      textContent: `Your AgroVoice verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo could not send the verification email (${response.status}): ${body.slice(0, 250)}`)
  }
}

async function getGoogleProfile(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured yet.')
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
  const payload = ticket.getPayload()
  if (!payload?.email || !payload.email_verified || !payload.sub) throw new Error('Google did not return a verified email address.')
  return { email: payload.email.toLowerCase(), name: payload.name || payload.email.split('@')[0], google_sub: payload.sub }
}

// ---------- auth routes ----------

app.post('/api/auth/signup', async (req, res, next) => {
  try {
  const name = String(req.body.name || '').trim()
  const phone = normalizePhone(req.body.phone)
  const email = String(req.body.email || '').trim().toLowerCase()
  const pin = String(req.body.pin || '')

  if (!name || phone.length < 10 || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Enter your name, a valid phone number, and a valid email address.' })
  }
  if (!/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 6 numbers.' })
  }
  const existing = await User.findOne({ $or: [{ phone }, { email }] })
  if (existing && !existing.email_verified && existing.phone === phone && existing.email === email) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    existing.verification_code_hash = hashCode(code)
    existing.verification_expires_at = new Date(Date.now() + 10 * 60 * 1000)
    await existing.save()
    await sendVerificationEmail(email, code)
    return res.status(201).json({ verificationRequired: true, email })
  }
  if (existing) {
    return res.status(409).json({ error: 'This phone number or email already has an account. Please sign in.' })
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  const row = await User.create({ name, phone, email, email_verified: false, verification_code_hash: hashCode(code), verification_expires_at: new Date(Date.now() + 10 * 60 * 1000), pin_hash: bcrypt.hashSync(pin, 10) })
  await sendVerificationEmail(email, code)
  res.status(201).json({ verificationRequired: true, email: row.email })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'This phone number or email already has an account. Please sign in.' })
    next(e)
  }
})

app.post('/api/auth/verify-email', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const code = String(req.body.code || '').trim()
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code from your email.' })
    const row = await User.findOne({ email })
    if (!row) return res.status(404).json({ error: 'Account not found. Create your account again.' })
    if (row.email_verified) return res.status(409).json({ error: 'This email is already verified. Please sign in.' })
    if (!row.verification_code_hash || !row.verification_expires_at || row.verification_expires_at < new Date()) {
      return res.status(400).json({ error: 'That code has expired. Request a new code.' })
    }
    if (hashCode(code) !== row.verification_code_hash) return res.status(400).json({ error: 'That verification code is not correct.' })
    row.email_verified = true
    row.verification_code_hash = null
    row.verification_expires_at = null
    await row.save()
    const user = { id: String(row._id), name: row.name, phone: row.phone }
    res.json({ token: signToken(user), user })
  } catch (e) { next(e) }
})

app.post('/api/auth/resend-code', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const row = await User.findOne({ email })
    if (!row) return res.status(404).json({ error: 'Account not found. Create your account again.' })
    if (row.email_verified) return res.status(409).json({ error: 'This email is already verified. Please sign in.' })
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    row.verification_code_hash = hashCode(code)
    row.verification_expires_at = new Date(Date.now() + 10 * 60 * 1000)
    await row.save()
    await sendVerificationEmail(email, code)
    res.json({ ok: true })
  } catch (e) { next(e) }
})

app.post('/api/auth/google', async (req, res, next) => {
  try {
    const profile = await getGoogleProfile(req.body.credential)
    const row = await User.findOne({ $or: [{ email: profile.email }, { google_sub: profile.google_sub }] })
    if (row) {
      if (row.email !== profile.email) return res.status(409).json({ error: 'This Google account is already linked to a different email.' })
      row.email_verified = true
      row.google_sub = profile.google_sub
      await row.save()
      const user = { id: String(row._id), name: row.name, phone: row.phone }
      return res.json({ token: signToken(user), user })
    }
    res.json({ needsProfile: true, email: profile.email, name: profile.name })
  } catch (e) { res.status(400).json({ error: e.message || 'Google sign-in failed.' }) }
})

app.post('/api/auth/google/complete', async (req, res, next) => {
  try {
    const profile = await getGoogleProfile(req.body.credential)
    const phone = normalizePhone(req.body.phone)
    const pin = String(req.body.pin || '')
    if (phone.length < 10) return res.status(400).json({ error: 'Enter a valid phone number.' })
    if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 6 numbers.' })
    if (await User.exists({ $or: [{ phone }, { email: profile.email }] })) return res.status(409).json({ error: 'This phone number or email already has an account. Sign in with that account instead.' })
    const row = await User.create({ ...profile, phone, email_verified: true, pin_hash: bcrypt.hashSync(pin, 10) })
    const user = { id: String(row._id), name: row.name, phone: row.phone }
    res.status(201).json({ token: signToken(user), user })
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'This phone number or email already has an account. Sign in instead.' })
    next(e)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
 try {
  const phone = normalizePhone(req.body.phone)
  const pin = String(req.body.pin || '')

  if (tooManyAttempts(phone)) {
    return res.status(429).json({ error: 'Too many wrong attempts. Try again in 15 minutes.' })
  }
  const row = await User.findOne({ phone })
  if (!row || !bcrypt.compareSync(pin, row.pin_hash)) {
    recordFailure(phone)
    return res.status(401).json({ error: 'Wrong phone number or PIN.' })
  }
  if (!row.email_verified) return res.status(403).json({ error: 'Verify your email before signing in.' })
  attempts.delete(phone)
  const user = { id: String(row._id), name: row.name, phone: row.phone }
  res.json({ token: signToken(user), user })
 } catch (e) { next(e) }
})

app.get('/api/me', auth, async (req, res, next) => {
 try {
  const user = await User.findById(req.userId).select('name phone')
  if (!user) return res.status(401).json({ error: 'Account not found. Please log in again.' })
  res.json({ id: String(user._id), name: user.name, phone: user.phone })
 } catch (e) { next(e) }
})

// ---------- questions ----------

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random file name so nobody can guess it. We keep only the extension.
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.fieldname === 'photo'
        ? file.mimetype.startsWith('image/')
        : file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm'
    cb(null, ok)
  },
})

app.post(
  '/api/questions',
  auth,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'photo', maxCount: 1 }]),
  async (req, res, next) => {
   try {
    const language = req.body.language === 'en' ? 'en' : 'ha'
    const text = String(req.body.question_text || '').trim() || null
    const audio = req.files?.audio?.[0]?.filename || null
    const photo = req.files?.photo?.[0]?.filename || null

    if (!text && !audio && !photo) {
      return res.status(400).json({ error: 'Send a recording, a photo, or a typed question.' })
    }
    const question = await Question.create({ user_id: req.userId, language, question_text: text, audio_file: audio, photo_file: photo })
    const id = String(question._id)
    processQuestion(id) // runs in the background: speech to text, advice, voice answer
    res.status(201).json({ id })
   } catch (e) { next(e) }
  }
)

app.get('/api/questions', auth, async (req, res, next) => {
 try {
  const rows = await Question.find({ user_id: req.userId }).sort({ _id: -1 }).lean()
  res.json(rows.map(toQuestionJSON))
 } catch (e) { next(e) }
})

app.get('/api/questions/:id', auth, async (req, res, next) => {
 try {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Question not found.' })
  const q = await Question.findOne({ _id: req.params.id, user_id: req.userId })
  if (!q) return res.status(404).json({ error: 'Question not found.' })
  res.json(toQuestionJSON(q))
 } catch (e) { next(e) }
})

// Try a failed question again (for example after fixing an API key).
app.post('/api/questions/:id/retry', auth, async (req, res, next) => {
 try {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ error: 'Question not found.' })
  const q = await Question.findOne({ _id: req.params.id, user_id: req.userId }).select('status')
  if (!q) return res.status(404).json({ error: 'Question not found.' })
  if (q.status !== 'failed') return res.status(400).json({ error: 'Only failed questions can be retried.' })
  processQuestion(String(q._id))
  res.status(202).json({ ok: true })
 } catch (e) { next(e) }
})

// Files are private: only the person who owns the question can download its files.
app.get('/api/files/:name', auth, async (req, res, next) => {
 try {
  const name = path.basename(req.params.name)
  const owns = await Question.exists({ user_id: req.userId, $or: [{ audio_file: name }, { photo_file: name }, { answer_audio_file: name }] })
  if (!owns) return res.status(404).json({ error: 'File not found.' })
  res.sendFile(path.join(UPLOAD_DIR, name))
 } catch (e) { next(e) }
})

// ---------- errors ----------

app.use((err, req, res, next) => {
  console.error(err)
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (15 MB maximum).' : err.message
  res.status(400).json({ error: message || 'Something went wrong.' })
})

await connectDatabase()
app.listen(PORT, () => {
  console.log(`AgroVoice server running on http://localhost:${PORT}`)
  console.log(`AI: speech-to-text=${process.env.AI_STT || 'elevenlabs'}, advisor=${process.env.AI_ADVISOR || 'nvidia'}, voice=${process.env.AI_TTS || '9jalingo'}`)
  resumePending()
})
