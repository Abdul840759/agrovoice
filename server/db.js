import mongoose from 'mongoose'

const { Schema } = mongoose

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
  email_verified: { type: Boolean, default: false },
  verification_code_hash: { type: String, default: null },
  verification_expires_at: { type: Date, default: null },
  google_sub: { type: String, default: undefined },
  pin_hash: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

const questionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  language: { type: String, enum: ['ha', 'en'], default: 'ha' },
  question_text: { type: String, default: null },
  audio_file: { type: String, default: null },
  photo_file: { type: String, default: null },
  transcript: { type: String, default: null },
  answer_text: { type: String, default: null },
  answer_audio_file: { type: String, default: null },
  status: { type: String, enum: ['pending', 'answered', 'failed'], default: 'pending', index: true },
  stage: { type: String, default: null },
  error: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

questionSchema.index({ user_id: 1, _id: -1 })
userSchema.index({ google_sub: 1 }, { unique: true, partialFilterExpression: { google_sub: { $type: 'string' } } })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema)

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required.')
  await mongoose.connect(uri)
  console.log('Connected to MongoDB.')
}

export function toQuestionJSON(doc) {
  const q = doc.toObject ? doc.toObject() : doc
  return { ...q, id: String(q._id), user_id: String(q.user_id), _id: undefined, __v: undefined }
}
