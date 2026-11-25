// Every request to the Express server goes through this file.

const TOKEN_KEY = 'agrovoice_token'
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, { ...options, headers })
  } catch {
    throw new Error('Cannot reach the server. Check your connection.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong.')
    err.status = res.status
    throw err
  }
  return data
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  signup: (form) => request('/auth/signup', json(form)),
  login: (form) => request('/auth/login', json(form)),
  me: () => request('/me'),
  sendQuestion: (formData) => request('/questions', { method: 'POST', body: formData }),
  listQuestions: () => request('/questions'),
  getQuestion: (id) => request(`/questions/${id}`),
  retryQuestion: (id) => request(`/questions/${id}/retry`, { method: 'POST' }),
}

// Files are private, so we download them with the login token and make a temporary local link.
export async function fileUrl(name) {
  if (!name) return null
  const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) return null
  return URL.createObjectURL(await res.blob())
}
