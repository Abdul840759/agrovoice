import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { useAuth } from './AuthContext'
import Hero from './Hero'
import { Mic, Camera, Send, Close, Leaf, Bug, Basket, Sprout } from './Icons'
import './styles.css'

// Quick questions. Tapping one fills the typing box. (Hausa wording: please have a native speaker check it.)
const PROMPTS = {
  ha: [
    [Leaf, 'Ganye rawaya', 'Ganyen shuka sun yi rawaya. Me ya jawo haka?'],
    [Bug, 'Kwari', 'Kwari sun addabi amfanin gona na. Me zan yi?'],
    [Basket, 'Lokacin girbi', 'Yaushe zan girbe amfanin gona na?'],
    [Sprout, 'Lokacin shuka', 'Yaushe ne lokacin shuka?'],
  ],
  en: [
    [Leaf, 'Yellow leaves', 'The leaves on my plants are turning yellow. What is causing it?'],
    [Bug, 'Pests', 'Insects are attacking my crop. What should I do?'],
    [Basket, 'Harvest time', 'When should I harvest my crop?'],
    [Sprout, 'Planting time', 'When is the best time to plant?'],
  ],
}

// General farming tips, one per day. (Have an extension worker review these.)
const TIPS = {
  ha: [
    'Ka shayar da shuka da safe don rage cututtuka.',
    'Ka canza nau\u2019in amfanin gona a kowace kaka don rage kwari da cututtuka.',
    'Ka duba bayan ganye da wuri don gano kwari kafin su yawaita.',
  ],
  en: [
    'Water plants in the morning to reduce disease.',
    'Rotate your crops each season to reduce pests and disease.',
    'Check under the leaves early to spot pests before they spread.',
  ],
}

// Phone photos are big. Shrinking them first saves mobile data and keeps them under the AI size limit.
async function shrinkImage(file, maxSide = 1600) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob || file
  } catch {
    return file // the browser could not read it (some HEIC files): send the original
  }
}

export default function Ask({ onSent }) {
  const { user } = useAuth()
  const [language, setLanguage] = useState('ha') // ha | en
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoKey, setPhotoKey] = useState(0) // changing this resets the file input
  const [audio, setAudio] = useState(null) // recorded Blob
  const [recording, setRecording] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const recorder = useRef(null)
  const chunks = useRef([])
  const photoInput = useRef(null)

  // Temporary links so the farmer can see the photo and replay the recording.
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio])
  const tip = TIPS[language][new Date().getDate() % TIPS[language].length]

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [photoUrl, audioUrl])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunks.current = []
      rec.ondataavailable = (e) => chunks.current.push(e.data)
      rec.onstop = () => {
        setAudio(new Blob(chunks.current, { type: rec.mimeType }))
        stream.getTracks().forEach((t) => t.stop()) // release the microphone
      }
      rec.start()
      recorder.current = rec
      setRecording(true)
    } catch {
      setError('Could not use the microphone. Allow microphone access and try again.')
    }
  }

  function stopRecording() {
    if (recorder.current?.state === 'recording') recorder.current.stop()
    setRecording(false)
  }

  async function handleSend() {
    if (!text.trim() && !audio && !photo) {
      setError('Record a question, type one, or add a photo first.')
      return
    }
    setSending(true)
    setError('')
    try {
      // FormData is how a browser sends text and files together.
      const form = new FormData()
      form.append('language', language)
      if (text.trim()) form.append('question_text', text.trim())
      if (audio) form.append('audio', audio, `question.${audio.type.includes('mp4') ? 'mp4' : 'webm'}`)
      if (photo) {
        const small = await shrinkImage(photo)
        form.append('photo', small, small === photo ? photo.name : 'photo.jpg')
      }

      const { id } = await api.sendQuestion(form)
      setText(''); setAudio(null); setPhoto(null); setPhotoKey((k) => k + 1)
      onSent(id) // opens the result screen for this question
    } catch (e) {
      setError(e.message)
    }
    setSending(false)
  }

  return (
    <main className="nl ask">
      <Hero>
        <div className="ask-head">
          <div className="ask-greet">
            <h1>Sannu, {user.name}</h1>
            <p className="sub">Me kake so ka tambaya? <span>(What would you like to ask?)</span></p>
          </div>
          <div className="seg" role="group" aria-label="Language">
            <button type="button" className={language === 'ha' ? 'on' : ''}
                    onClick={() => setLanguage('ha')}>Hausa</button>
            <button type="button" className={language === 'en' ? 'on' : ''}
                    onClick={() => setLanguage('en')}>English</button>
          </div>
        </div>
        <div className="hero-tip">
          <Leaf width={18} height={18} />
          <span>{tip}</span>
        </div>
      </Hero>

      <div className="ask-actions pull rise">
        <button type="button" className={`ask-act mic${recording ? ' rec' : ''}`}
                onClick={recording ? stopRecording : startRecording}>
          <span className="ico"><Mic /></span>
          <span className="lbl">
            {recording ? 'Tsaya' : 'Magana'}
            <small>{recording ? 'Tap to stop' : 'Tap and speak'}</small>
          </span>
        </button>

        <button type="button" className="ask-act" onClick={() => photoInput.current?.click()}>
          <span className="ico"><Camera /></span>
          <span className="lbl">Hoto<small>Add a photo</small></span>
        </button>
        <input key={photoKey} ref={photoInput} type="file" accept="image/*" capture="environment" hidden
               onChange={(e) => setPhoto(e.target.files[0] || null)} />
      </div>

      {(photo || (audioUrl && !recording)) && (
        <div className="ask-attach rise">
          {photo && (
            <div className="ask-thumb">
              <img src={photoUrl} alt="Your crop photo" />
              <button type="button" aria-label="Remove photo"
                      onClick={() => { setPhoto(null); setPhotoKey((k) => k + 1) }}>
                <Close width={14} height={14} strokeWidth={2.4} />
              </button>
            </div>
          )}
          {audioUrl && !recording && <audio controls src={audioUrl} />}
        </div>
      )}

      <div>
        <div className="section-label">Gwada tambaya <small>Try asking</small></div>
        <div className="chips">
          {PROMPTS[language].map(([Icon, label, sentence]) => (
            <button key={label} type="button" className="chip" onClick={() => setText(sentence)}>
              <Icon width={18} height={18} /> {label}
            </button>
          ))}
        </div>
      </div>

      <textarea aria-label="Type your question" rows={3}
                placeholder="Ko ka rubuta tambaya (Or type your question)"
                value={text} onChange={(e) => setText(e.target.value)} />

      {error && <p className="nl-error" role="alert">{error}</p>}

      <button className="nl-btn ask-send" type="button" onClick={handleSend} disabled={sending}>
        {sending ? 'Sending...' : <>Aika (Send) <Send width={20} height={20} /></>}
      </button>
    </main>
  )
}
