import { useEffect, useState } from 'react'
import { api, initials, timeAgo, type ProjectRow } from '../api'
import { navigate } from '../main'
import { Icon } from '../icons'
import type { User } from '../types'
import { t, tn, useLang } from '../i18n'
import { LangSwitch } from '../LangSwitch'
import { Logo } from '../Logo'

export function Projects({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  useLang()
  const [rows, setRows] = useState<ProjectRow[] | null>(null)
  const [name, setName] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () => api.projects().then(setRows, (e) => setError(e.message))
  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const p = await api.create(name.trim() || t('Nuevo proyecto'))
    navigate(`/p/${p.id}`)
  }

  async function rename(p: ProjectRow) {
    const n = prompt(t('Nuevo nombre'), p.name)
    setMenu(null)
    if (n && n.trim()) {
      await api.rename(p.id, n.trim())
      load()
    }
  }
  async function duplicate(p: ProjectRow) {
    setMenu(null)
    await api.create(t('{name} copia', { name: p.name }), p.id)
    load()
  }
  async function remove(p: ProjectRow) {
    setMenu(null)
    if (confirm(t('¿Eliminar "{name}"? Se borrarán sus pantallas y comentarios.', { name: p.name }))) {
      await api.remove(p.id)
      load()
    }
  }

  return (
    <main className="home">
      <header className="home-bar">
        <div className="wordmark"><Logo size={24} /></div>
        <div className="home-user">
          <LangSwitch />
          <span className="avatar" style={{ background: user.color }}>{initials(user.name)}</span>
          <span className="home-user-name">{user.name}</span>
          <button
            className="icon-btn"
            title={t('Salir')}
            aria-label={t('Salir')}
            onClick={async () => {
              await api.logout()
              onSignOut()
            }}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      <div className="home-col">
        <h1 className="home-title">{t('Proyectos del equipo')}</h1>
        <form className="home-new" onSubmit={create}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Nombre del nuevo proyecto')} maxLength={80} />
          <button className="btn primary">{t('Crear proyecto')}</button>
        </form>

        {error && <p className="form-error">{error}</p>}
        {rows === null ? (
          <p className="muted">{t('Cargando…')}</p>
        ) : rows.length === 0 ? (
          <div className="home-empty">
            <p>{t('Aún no hay proyectos. Crea el primero y comparte el enlace con tu equipo.')}</p>
          </div>
        ) : (
          <ul className="proj-list">
            {rows.map((p) => (
              <li key={p.id} className="proj">
                <a
                  href={`/p/${p.id}`}
                  className="proj-main"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/p/${p.id}`)
                  }}
                >
                  <span className="proj-name">{p.name}</span>
                  <span className="proj-meta">
                    {tn(p.screens, '{n} pantalla', '{n} pantallas')}
                    {p.comments ? ` · ${tn(p.comments, '{n} comentario abierto', '{n} comentarios abiertos')}` : ''} · {timeAgo(p.updatedAt)}
                  </span>
                </a>
                <div className="proj-actions">
                  <button className="icon-btn" aria-label={t('Opciones')} onClick={() => setMenu(menu === p.id ? null : p.id)}>
                    <Icon name="more" size={20} />
                  </button>
                  {menu === p.id && (
                    <div className="menu" onMouseLeave={() => setMenu(null)}>
                      <button onClick={() => rename(p)}><Icon name="edit" size={16} />{t('Renombrar')}</button>
                      <button onClick={() => duplicate(p)}><Icon name="copy" size={16} />{t('Duplicar')}</button>
                      <button className="danger" onClick={() => remove(p)}><Icon name="trash" size={16} />{t('Eliminar')}</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
