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

  const signUp = (form) => finish(api.signup(form))
  const signIn = (form) => finish(api.login(form))

  function signOut() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
