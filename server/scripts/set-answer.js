// Fake an AI answer so you can test the result screen before the AI step exists.
// Usage:  npm run set-answer -- 1 "Remove the affected leaves and water at the base."
import db from '../db.js'

const [id, ...rest] = process.argv.slice(2)
const text = rest.join(' ').trim()

if (!id || !text) {
  console.log('Usage: npm run set-answer -- <question id> "<answer text>"')
  process.exit(1)
}

const info = db
  .prepare("UPDATE questions SET answer_text = ?, status = 'answered' WHERE id = ?")
  .run(text, id)

console.log(info.changes ? `Answer saved for question ${id}.` : `No question with id ${id}.`)
