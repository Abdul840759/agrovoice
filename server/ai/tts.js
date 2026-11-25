// Text to speech: turns the written answer into a voice file.
// Voice answers are optional. When enabled, Hausa answers use 9jaLingo; English remains text-only.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export async function speak({ text, language, outDir }) {
  const provider = (process.env.AI_TTS || '9jalingo').toLowerCase()
  if (provider === 'none' || provider === 'mock') return null
  if (provider === '9jalingo') {
    if (language !== 'ha') return null // this service has Hausa, Igbo, Yoruba and Pidgin voices, not English
    return naijalingo(text, outDir)
  }
  throw new Error(`Unknown AI_TTS "${provider}". Use "9jalingo" or "none".`)
}

async function naijalingo(text, outDir) {
  const key = process.env.NAIJALINGO_API_KEY
  if (!key) throw new Error('NAIJALINGO_API_KEY is missing in server/.env')
  const base = process.env.NAIJALINGO_BASE_URL || 'https://api.9jalingo.org'

  const res = await fetch(`${base}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'x-api-key': key },
    body: JSON.stringify({
      input: text,
      voice: process.env.NAIJALINGO_SPEAKER || 'aisha_ha',
      lang: 'ha',
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  // An error comes back as JSON, for example {"detail":"Invalid API Key"}. Never save that as audio.
  const type = res.headers.get('content-type') || ''
  if (!res.ok || type.includes('json')) {
    const body = await res.text()
    throw new Error(`Text-to-speech failed (${res.status}): ${body.slice(0, 300)}`)
  }
  const filename = crypto.randomUUID() + '.mp3'
  fs.writeFileSync(path.join(outDir, filename), Buffer.from(await res.arrayBuffer()))
  return filename
}
