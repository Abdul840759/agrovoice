// The whole AI journey for one question:
//   voice -> text (speech to text) -> advice (advisor) -> voice (text to speech)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from '../db.js'
import { transcribe } from './stt.js'
import { advise } from './advisor.js'
import { speak } from './tts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const running = new Set() // question ids being processed right now

const setStage = (id, stage) => db.prepare('UPDATE questions SET stage = ? WHERE id = ?').run(stage, id)

export async function processQuestion(id) {
  if (running.has(id)) return
  running.add(id)
  try {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id)
    if (!q) return
    db.prepare("UPDATE questions SET status = 'pending', error = NULL, stage = 'starting' WHERE id = ?").run(id)

    // 1. Speech to text (skipped when we already have the transcript, for example on a retry)
    let transcript = q.transcript
    if (q.audio_file && !transcript) {
      setStage(id, 'transcribing')
      transcript = await transcribe({ filePath: path.join(UPLOAD_DIR, q.audio_file), language: q.language })
      db.prepare('UPDATE questions SET transcript = ? WHERE id = ?').run(transcript, id)
    }

    // 2. Advice. Typed text and the transcript are both used if the farmer gave both.
    setStage(id, 'thinking')
    const questionText = [q.question_text, transcript].filter(Boolean).join('\n')
    const answer = await advise({
      language: q.language,
      text: questionText,
      photoPath: q.photo_file ? path.join(UPLOAD_DIR, q.photo_file) : null,
    })
    db.prepare('UPDATE questions SET answer_text = ? WHERE id = ?').run(answer, id)

    // 3. Voice answer. If this fails the farmer still gets the text answer.
    setStage(id, 'speaking')
    let audioFile = null
    try {
      audioFile = await speak({ text: answer, language: q.language, outDir: UPLOAD_DIR })
    } catch (e) {
      console.error(`Question ${id}: voice answer failed:`, e.message)
    }

    db.prepare("UPDATE questions SET answer_audio_file = ?, status = 'answered', stage = NULL WHERE id = ?").run(audioFile, id)
  } catch (e) {
    console.error(`Question ${id} failed:`, e.message)
    db.prepare("UPDATE questions SET status = 'failed', stage = NULL, error = ? WHERE id = ?").run(String(e.message).slice(0, 500), id)
  } finally {
    running.delete(id)
  }
}

// When the server starts, finish any questions that were still waiting.
export function resumePending() {
  const rows = db.prepare("SELECT id FROM questions WHERE status = 'pending'").all()
  ;(async () => {
    for (const { id } of rows) await processQuestion(id)
  })()
}
