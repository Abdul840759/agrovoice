// The farm advisor: question (+ optional crop photo) in, advice text out.
// Farm advice uses NVIDIA's OpenAI-compatible inference endpoint. Mock responses are unsupported.
import fs from 'node:fs'
import path from 'node:path'

const IMAGE_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
}
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024 // base64 adds about a third; the API limit is 5 MB per image

function systemPrompt(language) {
  const lang = language === 'en' ? 'English' : 'Hausa'
  const hausaRules =
    language === 'en'
      ? ''
      : `Write simple, natural Hausa in the standard Latin (boko) script, using the letters \u0253, \u0257, \u0199 and \u01b4 where needed. Avoid hard English words. If you must use a technical word (for example fungicide), explain it in a few simple Hausa words.\n`

  return `You are AgroVoice, a friendly farm advisor for smallholder farmers around Jos, Plateau State, Nigeria. Typical crops: Irish potato, tomato, maize, pepper, onion, cabbage and beans.

Your answer will be read aloud to the farmer, so:
- Reply ONLY in ${lang}.
${hausaRules}- Use short, simple sentences. No markdown, no bullet symbols, no tables, no emojis, no headings. For steps, say "First", "Second", "Third" in the farmer's language.
- Keep the whole answer under 110 words.

How to answer:
1. If a photo is attached, say in one sentence what you can see, then the most likely cause. If the photo is unclear or you are not sure, say so plainly and name one or two possible causes instead of guessing.
2. Give 2 to 4 practical steps the farmer can do now, starting with the cheapest and safest.
3. For chemicals, never give doses from memory. Tell the farmer to ask the agro-dealer for a product approved for that problem, and to follow the label for the dose, protective clothing and the waiting time before harvest.
4. If the problem looks serious, is spreading fast, or you cannot tell what it is, tell the farmer to show the plant to the nearest agricultural extension officer.
5. If the question is unclear, ask ONE short question to learn more instead of guessing.
6. Do not invent prices, weather, laws or product brand names. If the question is not about farming, politely say you can only help with farming.`
}

export async function advise({ language, text, photoPath }) {
  const provider = (process.env.AI_ADVISOR || 'nvidia').toLowerCase()
  if (provider === 'nvidia') return nvidia({ language, text, photoPath })
  throw new Error(`Unknown AI_ADVISOR "${provider}". Use "nvidia".`)
}

async function nvidia({ language, text, photoPath }) {
  const key = process.env.NVIDIA_API_KEY
  if (!key) throw new Error('NVIDIA_API_KEY is missing in the server environment.')
  const base = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'

  const content = []
  let photoNote = ''
  if (photoPath) {
    const type = IMAGE_TYPES[path.extname(photoPath).toLowerCase()]
    const bytes = fs.readFileSync(photoPath)
    if (type && bytes.length <= MAX_IMAGE_BYTES) {
      content.push({ type: 'image_url', image_url: { url: `data:${type};base64,${bytes.toString('base64')}` } })
    } else {
      photoNote = '\n(The farmer also sent a photo, but it could not be read. Mention this briefly and ask them to send a smaller or clearer photo.)'
    }
  }

  const question = text
    ? `The farmer's question: ${text}${photoNote}`
    : `The farmer sent only a photo of their crop. Tell them what you see and what to do. If you cannot tell, ask what they want to know.${photoNote}`
  content.push({ type: 'text', text: question })

  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b',
      max_tokens: 700,
      messages: [{ role: 'system', content: systemPrompt(language) }, { role: 'user', content }],
    }),
    signal: AbortSignal.timeout(90_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`NVIDIA advisor failed (${res.status}): ${JSON.stringify(data.error || data).slice(0, 300)}`)
  }
  const answer = String(data.choices?.[0]?.message?.content || '').trim()
  if (!answer) throw new Error('The advisor returned an empty answer.')
  return answer
}
