import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The whole database is one file: server/agrovoice.db (created automatically).
const db = new Database(process.env.DATABASE_PATH || path.join(__dirname, 'agrovoice.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'ha',          -- ha = Hausa, en = English
    question_text TEXT,                            -- typed question (or speech-to-text later)
    audio_file TEXT,                               -- recorded voice question (file name in uploads/)
    photo_file TEXT,                               -- crop photo (file name in uploads/)
    answer_text TEXT,                              -- filled in by the AI step
    answer_audio_file TEXT,                        -- Hausa voice answer, filled in by the AI step
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'failed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
`)

// Add columns that older databases do not have yet.
function addColumn(table, name, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  if (!cols.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
}
addColumn('questions', 'transcript', 'TEXT') // what speech-to-text heard
addColumn('questions', 'stage', 'TEXT') // which AI step is running now
addColumn('questions', 'error', 'TEXT') // why a question failed

export default db
