import { useEffect, useState } from 'react'
import { api } from './api'
import Hero from './Hero'
import { Clock, Chevron, Mic, Camera, Lines } from './Icons'
import './styles.css'

const STATUS = { pending: 'Working', answered: 'Answered', failed: 'Failed' }

function kindIcon(q) {
  if (q.audio_file) return Mic
  if (q.question_text) return Lines
  return Camera
}

export default function History({ refreshKey, onOpen }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listQuestions()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return <div className="ag-spinner" role="status" aria-label="Loading" />
  if (error) return <p className="nl nl-error">{error}</p>

  return (
    <main className="nl">
      <Hero>
        <h1>Tarihi <small>History</small></h1>
        <p className="sub">
          {items.length === 0 ? 'Your questions will appear here.' : `${items.length} question${items.length === 1 ? '' : 's'} asked`}
        </p>
      </Hero>

      {items.length === 0 ? (
        <div className="ag-empty pull rise">
          <span className="ico"><Clock width={28} height={28} /></span>
          <h2>No questions yet</h2>
          <p>Open Tambaya (Ask) and send your first question.</p>
        </div>
      ) : (
        <div className="ag-list pull">
          {items.map((q, i) => {
            const Icon = kindIcon(q)
            return (
              <button key={q.id} type="button" className="ag-item rise" style={{ '--i': i }} onClick={() => onOpen(q.id)}>
                <span className="ag-item-ico"><Icon width={20} height={20} /></span>
                <span className="ag-item-main">
                  <strong className="ag-item-title">
                    {q.question_text || (q.audio_file ? 'Voice question' : 'Photo question')}
                  </strong>
                  <span className="ag-meta">
                    {new Date(q.created_at).toLocaleString()} ({q.language === 'ha' ? 'Hausa' : 'English'})
                    {q.photo_file && (q.question_text || q.audio_file) ? ', with photo' : ''}
                  </span>
                  <span className="ag-item-answer">{q.answer_text || 'Waiting for the answer...'}</span>
                </span>
                <span className="ag-item-side">
                  <span className={`ag-chip ${q.status}`}><i className="dot" />{STATUS[q.status]}</span>
                  <Chevron width={18} height={18} />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
