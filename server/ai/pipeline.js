// The whole AI journey for one question:
//   voice -> text (speech to text) -> advice (advisor) -> voice (text to speech)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Question } from '../db.js'
import { transcribe } from './stt.js'
import { advise } from './advisor.js'
import { speak } from './tts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const running = new Set() // question ids being processed right now

const setStage = (id, stage) => Question.updateOne({ _id: id }, { $set: { stage } })

export async function processQuestion(id) {
  if (running.has(id)) return
  running.add(id)
  try {
    const q = await Question.findById(id).lean()
    if (!q) return
    await Question.updateOne({ _id: id }, { $set: { status: 'pending', error: null, stage: 'starting' } })

    // 1. Speech to text (skipped when we already have the transcript, for example on a retry)
    let transcript = q.transcript
    if (q.audio_file && !transcript) {
      setStage(id, 'transcribing')
      transcript = await transcribe({ filePath: path.join(UPLOAD_DIR, q.audio_file), language: q.language })
      await Question.updateOne({ _id: id }, { $set: { transcript } })
    }

    // 2. Advice. Typed text and the transcript are both used if the farmer gave both.
    setStage(id, 'thinking')
    const questionText = [q.question_text, transcript].filter(Boolean).join('\n')
    const answer = await advise({
      language: q.language,
      text: questionText,
      photoPath: q.photo_file ? path.join(UPLOAD_DIR, q.photo_file) : null,
    })
    await Question.updateOne({ _id: id }, { $set: { answer_text: answer } })

    // 3. Voice answer. If this fails the farmer still gets the text answer.
    setStage(id, 'speaking')
    let audioFile = null
    try {
      audioFile = await speak({ text: answer, language: q.language, outDir: UPLOAD_DIR })
    } catch (e) {
      console.error(`Question ${id}: voice answer failed:`, e.message)
    }

    await Question.updateOne({ _id: id }, { $set: { answer_audio_file: audioFile, status: 'answered', stage: null } })
  } catch (e) {
    console.error(`Question ${id} failed:`, e.message)
    await Question.updateOne({ _id: id }, { $set: { status: 'failed', stage: null, error: String(e.message).slice(0, 500) } })
  } finally {
    running.delete(id)
  }
}

// When the server starts, finish any questions that were still waiting.
export function resumePending() {
  Question.find({ status: 'pending' }).select('_id').lean().then((rows) => {
    for (const row of rows) processQuestion(String(row._id))
  }).catch((error) => console.error('Could not resume pending questions:', error.message))
}
