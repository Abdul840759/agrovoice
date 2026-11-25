import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import Ask from './Ask'
import History from './History'
import Result from './Result'
import { Leaf, Mic, Clock, Logout } from './Icons'
import './styles.css'

function Screen() {
  const { user, loading, signOut } = useAuth()
  const [tab, setTab] = useState('ask') // ask | history
  const [openId, setOpenId] = useState(null) // question being viewed on the result screen
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) return <div className="ag-spinner" role="status" aria-label="Loading" />
  if (!user) return <Login />

  function closeResult() {
    setOpenId(null)
    setRefreshKey((k) => k + 1) // reload History so it shows the latest answer
  }

  let screen
  if (openId) screen = <Result id={openId} onBack={closeResult} />
  else if (tab === 'ask') screen = <Ask onSent={setOpenId} />
  else screen = <History refreshKey={refreshKey} onOpen={setOpenId} />

  return (
    <div className="shell">
      <header className="ag-top">
        <button className="ag-brand" type="button" onClick={() => { setOpenId(null); setTab('ask') }} aria-label="AgroVoice home">
          <span className="ag-logo"><Leaf /></span>
          <span>AgroVoice <small>FARMER SUPPORT</small></span>
        </button>
        <button className="ag-ghost" onClick={signOut} aria-label="Log out">
          <Logout width={18} height={18} /> Log out
        </button>
      </header>

      {screen}

      <nav className="ag-nav" aria-label="Main">
        <button className={tab === 'ask' ? 'on' : ''} onClick={() => { setOpenId(null); setTab('ask') }}>
          <Mic width={22} height={22} />
          <span>Tambaya <small>Ask</small></span>
        </button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => { setOpenId(null); setTab('history') }}>
          <Clock width={22} height={22} />
          <span>Tarihi <small>History</small></span>
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
