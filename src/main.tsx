import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { api, getUser, saveUser } from './api'
import { getLang, LangContext, setLangGlobal, t, type Lang } from './i18n'
import { Login } from './pages/Login'
import { Projects } from './pages/Projects'
import { Editor } from './editor/Editor'
import type { User } from './types'

export function navigate(to: string) {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}

function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const on = () => setPath(location.pathname)
    addEventListener('popstate', on)
    return () => removeEventListener('popstate', on)
  }, [])
  return path
}

function App() {
  const path = usePath()
  const [user, setUserState] = useState<User | null>(getUser())
  const setUser = (u: User) => {
    saveUser(u)
    setUserState(u)
  }
  const share = path.match(/^\/v\/([\w-]+)/)
  if (share) return <ViewerRoute token={share[1]} user={user} setUser={setUser} />
  return <MemberRoute path={path} user={user} setUser={setUser} />
}

function MemberRoute({ path, user, setUser }: { path: string; user: User | null; setUser: (u: User) => void }) {
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>('checking')
  useEffect(() => {
    api.me().then(
      () => setAuth('in'),
      () => setAuth('out'),
    )
  }, [])

  if (auth === 'checking') return <div className="boot" />
  if (auth === 'out' || !user)
    return (
      <Login
        needsCode={auth === 'out'}
        onDone={(u) => {
          setUser(u)
          setAuth('in')
        }}
      />
    )
  const m = path.match(/^\/p\/([\w-]+)/)
  if (m) return <Editor key={m[1]} projectId={m[1]} user={user} onUserChange={setUser} />
  return <Projects user={user} onSignOut={() => setAuth('out')} />
}

function ViewerRoute({ token, user, setUser }: { token: string; user: User | null; setUser: (u: User) => void }) {
  const [info, setInfo] = useState<{ id: string; name: string } | null | 'bad'>(null)
  useEffect(() => {
    api.shareInfo(token).then(setInfo, () => setInfo('bad'))
  }, [token])
  if (info === null) return <div className="boot" />
  if (info === 'bad')
    return (
      <main className="notfound">
        <div>
          <div className="wordmark">Trazo</div>
          <p className="gate-lead">{t('Este enlace ya no es válido. Pide uno nuevo a quien te lo compartió.')}</p>
        </div>
      </main>
    )
  if (!user) return <Login needsCode={false} invite={info.name} onDone={setUser} />
  return <Editor key={info.id} projectId={info.id} user={user} share={token} shareName={info.name} onUserChange={setUser} />
}

function Root() {
  const [lang, setLangState] = useState<Lang>(getLang())
  const setLang = (l: Lang) => {
    setLangGlobal(l)
    setLangState(l)
  }
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <App />
    </LangContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
