import { useEffect, useState } from 'react'
import { api, fileUrl } from './api'
import Hero from './Hero'
import { Back } from './Icons'
import './styles.css'

const STATUS = { pending: 'Working', answered: 'Answered', failed: 'Failed' }
const STAGES = {
  starting: 'Getting ready...',
  transcribing: 'Listening to your question...',
  thinking: 'Preparing your advice...',
  speaking: 'Recording the voice answer...',
}

export default function Result({ id, onBack }) {
  const [q, setQ] = useState(null)
  const [urls, setUrls] = useState({})
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0) // changing this restarts the loading and checking

  // Load the question. While it is still pending, check again every 3 seconds.
  useEffect(() => {
    let stopped = false
    let timer
    async function load() {
      try {
        const data = await api.getQuestion(id)
        if (stopped) return
        setQ(data)
        if (data.status === 'pending') timer = setTimeout(load, 3000)
      } catch (e) {
        if (!stopped) setError(e.message)
      }
    }
    load()
    return () => { stopped = true; clearTimeout(timer) }
  }, [id, tick])

  // Download the photo, the recording and the voice answer as temporary local links.
  useEffect(() => {
    if (!q) return
    let stopped = false
    let made = []
    Promise.all([fileUrl(q.photo_file), fileUrl(q.audio_file), fileUrl(q.answer_audio_file)])
      .then(([photo, audio, answerAudio]) => {
        made = [photo, audio, answerAudio]
        if (stopped) { made.forEach((u) => u && URL.revokeObjectURL(u)); return }
        setUrls({ photo, audio, answerAudio })
      })
    return () => { stopped = true; made.forEach((u) => u && URL.revokeObjectURL(u)) }
  }, [q?.photo_file, q?.audio_file, q?.answer_audio_file])

  async function retry() {
    try {
      await api.retryQuestion(id)
      setQ({ ...q, status: 'pending', error: null, stage: 'starting' })
      setTick((t) => t + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <p className="nl nl-error">{error}</p>
  if (!q) return <div className="ag-spinner" role="status" aria-label="Loading" />

  return (
    <main className="nl">
      <Hero>
        <button type="button" className="ag-ghost ag-back" onClick={onBack}>
          <Back width={18} height={18} /> Koma baya (Back)
        </button>
        <div className="res-head">
          <h1>Sakamako <small>Result</small></h1>
          <span className={`ag-chip ${q.status}`}><i className="dot" />{STATUS[q.status]}</span>
        </div>
      </Hero>

      <div className="pull">
        {urls.photo && <img className="ag-result-photo rise" src={urls.photo} alt="Your crop photo" />}

        <section className="ag-card rise" style={{ '--i': 1 }}>
          <div className="ag-label">Tambayarka <small>Your question</small></div>
          {q.question_text && <p>{q.question_text}</p>}
          {urls.audio && <audio controls src={urls.audio} />}
          {q.transcript && (
            <p className="ag-heard"><span>Abin da muka ji (What we heard)</span>{q.transcript}</p>
          )}
          {!q.question_text && !q.audio_file && <p>Photo only</p>}
        </section>

        <section className="ag-card answer rise" style={{ '--i': 2 }}>
          <div className="ag-label">Amsa <small>Answer</small></div>
          {q.status === 'pending' && !q.answer_text && (
            <p>Muna nazarin tambayarka... <span className="ag-meta">{STAGES[q.stage] || 'Working on your answer...'}</span></p>
          )}
          {q.status === 'failed' && (
            <>
              <p>Could not answer this one.</p>
              {q.error && <p className="ag-meta">{q.error}</p>}
              <button type="button" className="ag-retry" onClick={retry}>Try again</button>
            </>
          )}
          {q.answer_text && <p>{q.answer_text}</p>}
          {urls.answerAudio && <audio controls src={urls.answerAudio} />}
        </section>
      </div>
    </main>
  )
}
