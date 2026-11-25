import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from './AuthContext'
import Hero from './Hero'
import { Leaf, Mic, Camera, Speaker } from './Icons'
import './styles.css'

const FEATURES = [
  [Mic, 'Speak in Hausa'],
  [Camera, 'Snap your crop'],
  [Speaker, 'Hear the answer'],
]
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const { signIn, signUp, verifyEmail, resendCode, signInGoogle, completeGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ name: '', phone: '', email: '', pin: '', code: '' })
  const [googleProfile, setGoogleProfile] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function update(e) { setForm({ ...form, [e.target.name]: e.target.value }) }
  function switchMode(next) {
    setMode(next); setStep('form'); setGoogleProfile(null); setError(''); setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    if (step === 'verify') {
      const result = await verifyEmail({ email: form.email, code: form.code })
      if (result.error) setError(result.error.message)
    } else if (googleProfile) {
      const result = await completeGoogle({ credential: googleProfile.credential, phone: form.phone, pin: form.pin })
      if (result.error) setError(result.error.message)
    } else if (mode === 'signup') {
      const result = await signUp(form)
      if (result.error) setError(result.error.message)
      else { setForm({ ...form, email: result.email, code: '' }); setStep('verify'); setNotice(`We sent a 6-digit code to ${result.email}.`) }
    } else {
      const result = await signIn({ phone: form.phone, pin: form.pin })
      if (result.error) setError(result.error.message)
    }
    setBusy(false)
  }

  async function handleGoogle(credential) {
    setBusy(true); setError(''); setNotice('')
    const result = await signInGoogle(credential)
    if (result.error) setError(result.error.message)
    else if (result.needsProfile) {
      setGoogleProfile({ credential, email: result.email, name: result.name })
      setForm({ ...form, name: result.name, email: result.email })
      setNotice('Add your phone number and create a 6-digit PIN to finish setting up your account.')
    }
    setBusy(false)
  }

  async function handleResend() {
    setBusy(true); setError(''); setNotice('')
    try { await resendCode(form.email); setNotice('A new verification code was sent.') }
    catch (e) { setError(e.message) }
    setBusy(false)
  }

  const title = step === 'verify' ? 'Verify your email' : googleProfile ? 'Finish your account' : mode === 'signup' ? 'Create account' : 'Sign in'

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
        {step === 'form' && !googleProfile && (
          <div className="seg full" role="group" aria-label="Sign in or create account">
            <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Create account</button>
          </div>
        )}

        <h2 className="auth-step-title">{title}</h2>
        {step === 'verify' && <p className="auth-help">Enter the 6-digit code sent to <strong>{form.email}</strong>.</p>}
        {googleProfile && <p className="auth-help">Google account: <strong>{googleProfile.email}</strong></p>}

        <form onSubmit={handleSubmit}>
          {step === 'form' && mode === 'signup' && !googleProfile && (
            <div className="field"><label htmlFor="name">Sunanka (Your name)</label><input id="name" name="name" autoComplete="name" value={form.name} onChange={update} required /></div>
          )}

          {step === 'form' && mode === 'signup' && !googleProfile && (
            <div className="field"><label htmlFor="email">Email address (for verification)</label><input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required /></div>
          )}

          {step === 'form' && (mode === 'signup' || googleProfile) && (
            <div className="field"><label htmlFor="phone">Lambar waya (Phone number)</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={update} required /></div>
          )}

          {step === 'form' && !googleProfile && mode === 'signin' && (
            <div className="field"><label htmlFor="phone">Lambar waya (Phone number)</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={update} required /></div>
          )}

          {step === 'form' && (
            <div className="field"><label htmlFor="pin">PIN (6 numbers)</label><input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete={mode === 'signup' || googleProfile ? 'new-password' : 'current-password'} value={form.pin} onChange={update} required /></div>
          )}

          {step === 'verify' && <div className="field"><label htmlFor="code">Verification code</label><input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={form.code} onChange={update} required /></div>}

          {error && <p className="nl-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}

          <button className="nl-btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : step === 'verify' ? 'Verify email' : googleProfile ? 'Complete account' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>

        {step === 'verify' && <div className="auth-secondary"><button type="button" onClick={handleResend} disabled={busy}>Resend code</button><button type="button" onClick={() => { setStep('form'); setError(''); setNotice('') }}>Back</button></div>}
        {googleProfile && <div className="auth-secondary"><button type="button" onClick={() => { setGoogleProfile(null); setError(''); setNotice('') }}>Back</button></div>}

        {step === 'form' && !googleProfile && <>
          <div className="auth-divider"><span>or</span></div>
          {GOOGLE_CLIENT_ID ? <div className="google-login"><GoogleLogin onSuccess={(response) => response.credential && handleGoogle(response.credential)} onError={() => setError('Google sign-in did not complete. Please try again.')} text="continue_with" shape="pill" width="320" /></div> : <p className="auth-help">Continue with Google will be available after Google sign-in is configured.</p>}
        </>}
      </div>

      <div className="auth-features">{FEATURES.map(([Icon, label], i) => <div key={label} className="auth-feature rise" style={{ '--i': i + 2 }}><span className="ico"><Icon width={22} height={22} /></span>{label}</div>)}</div>
    </main>
  )
}
