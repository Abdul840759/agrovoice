import { useState } from 'react'
import { useAuth } from './AuthContext'
import Hero from './Hero'
import { Leaf, Mic, Camera, Speaker } from './Icons'
import './styles.css'

const FEATURES = [
  [Mic, 'Speak in Hausa'],
  [Camera, 'Snap your crop'],
  [Speaker, 'Hear the answer'],
]

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [form, setForm] = useState({ name: '', phone: '', pin: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result = mode === 'signup' ? await signUp(form) : await signIn(form)
    if (result.error) setError(result.error.message)
    setBusy(false)
  }

  return (
    <main className="auth">
      <Hero tall>
        <div className="auth-brand">
          <span className="ag-logo lg"><Leaf width={30} height={30} /></span>
          <h1>AgroVoice</h1>
          <p className="tag">Farming advice in Hausa and English, by voice.</p>
        </div>
      </Hero>

      <div className="auth-card pull rise">
        <div className="seg full" role="group" aria-label="Sign in or create account">
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="name">Sunanka (Your name)</label>
              <input id="name" name="name" autoComplete="name" value={form.name} onChange={update} required />
            </div>
          )}

          <div className="field">
            <label htmlFor="phone">Lambar waya (Phone number)</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel"
                   value={form.phone} onChange={update} required />
          </div>

          <div className="field">
            <label htmlFor="pin">PIN (6 numbers)</label>
            <input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}"
                   maxLength={6} value={form.pin} onChange={update} required />
          </div>

          {error && <p className="nl-error" role="alert">{error}</p>}

          <button className="nl-btn" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>

      <div className="auth-features">
        {FEATURES.map(([Icon, label], i) => (
          <div key={label} className="auth-feature rise" style={{ '--i': i + 2 }}>
            <span className="ico"><Icon width={22} height={22} /></span>
            {label}
          </div>
        ))}
      </div>
    </main>
  )
}
