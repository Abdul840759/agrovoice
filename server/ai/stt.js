// Speech recognition uses ElevenLabs. Mock responses are intentionally unsupported.
import fs from 'node:fs'
import path from 'node:path'

const MIME = {
  '.webm': 'audio/webm', '.mp4': 'audio/mp4', '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
}

export async function transcribe({ filePath, language }) {
  const provider = (process.env.AI_STT || 'elevenlabs').toLowerCase()
  if (provider === 'elevenlabs') return elevenlabs(filePath, language)
  throw new Error(`Unknown AI_STT "${provider}". Use "elevenlabs".`)
}

async function elevenlabs(filePath, language) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY is missing in server/.env')
  const base = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io'

  const form = new FormData()
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2')
  form.append('language_code', language === 'en' ? 'eng' : 'hau') // ISO 639-3
  const ext = path.extname(filePath).toLowerCase()
  form.append(
    'file',
    new Blob([fs.readFileSync(filePath)], { type: MIME[ext] || 'application/octet-stream' }),
    path.basename(filePath)
  )

  const res = await fetch(`${base}/v1/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
    signal: AbortSignal.timeout(90_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Speech-to-text failed (${res.status}): ${JSON.stringify(data.detail || data).slice(0, 300)}`)
  }
  const text = String(data.text || '').trim()
  if (!text) throw new Error('No speech was recognised in the recording.')
  return text
}
