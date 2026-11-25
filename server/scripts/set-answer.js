// Set an answer on a MongoDB question for manual UI debugging.
// Usage: npm run set-answer -- <question id> "Answer text"
import { connectDatabase, Question } from '../db.js'

const [id, ...rest] = process.argv.slice(2)
const text = rest.join(' ').trim()
if (!id || !text) {
  console.log('Usage: npm run set-answer -- <question id> "<answer text>"')
  process.exit(1)
}

await connectDatabase()
const result = await Question.updateOne({ _id: id }, { $set: { answer_text: text, status: 'answered' } })
console.log(result.modifiedCount ? `Answer saved for question ${id}.` : `No question with id ${id}.`)
process.exit(0)
