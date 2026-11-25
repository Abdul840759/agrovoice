// Try each AI piece on its own, without the app. Run from the server folder:
//   npm run test-ai -- advisor ha "Ganyen tumatir na sun yi rawaya"
//   npm run test-ai -- photo   ha ./leaf.jpg "Me ke damun wannan ganye?"
//   npm run test-ai -- stt     ha ./recording.webm
//   npm run test-ai -- tts     ha "Sannu manomi, ina kwana?"
// Use "en" instead of "ha" for English.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transcribe } from '../ai/stt.js'
import { advise } from '../ai/advisor.js'
import { speak } from '../ai/tts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(outDir, { recursive: true })

const [kind, language, ...rest] = process.argv.slice(2)
const usage = () => { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 7).join('\n')); process.exit(1) }

try {
  if (kind === 'advisor' && language && rest.length) {
    console.log(await advise({ language, text: rest.join(' ') }))
  } else if (kind === 'photo' && language && rest.length >= 1) {
    const [photoPath, ...q] = rest
    console.log(await advise({ language, text: q.join(' '), photoPath: path.resolve(photoPath) }))
  } else if (kind === 'stt' && language && rest[0]) {
    console.log(await transcribe({ filePath: path.resolve(rest[0]), language }))
  } else if (kind === 'tts' && language && rest.length) {
    const file = await speak({ text: rest.join(' '), language, outDir })
    console.log(file ? `Saved: server/uploads/${file}` : 'No audio made (AI_TTS is "none", or the language has no voice).')
  } else usage()
} catch (e) {
  console.error('FAILED:', e.message)
  process.exit(1)
}
