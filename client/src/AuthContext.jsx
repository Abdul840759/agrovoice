import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On app start: is there a saved login on this phone?
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api.me()
      .then(setUser)
      .catch((e) => { if (e.status === 401) setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  // Shared by sign-up and sign-in: save the token, remember the user.
  async function finish(request) {
    try {
      const { token, user } = await request
      setToken(token)
      setUser(user)
      return {}
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  async function signUp(form) {
    try { return await api.signup(form) }
    catch (e) { return { error: { message: e.message } } }
  }
  const signIn = (form) => finish(api.login(form))
  const verifyEmail = (form) => finish(api.verifyEmail(form))
  const resendCode = (email) => api.resendCode(email)

  async function signInGoogle(credential) {
    try {
      const result = await api.googleAuth(credential)
      if (result.needsProfile) return result
      setToken(result.token)
      setUser(result.user)
      return result
    } catch (e) { return { error: { message: e.message } } }
  }

  const completeGoogle = (form) => finish(api.completeGoogle(form))

  function signOut() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, verifyEmail, resendCode, signInGoogle, completeGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
