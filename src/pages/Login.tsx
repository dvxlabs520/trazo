import { useState } from 'react'
import { api, COLORS, colorFor, getUser, saveUser } from '../api'
import { t, useLang } from '../i18n'
import { LangSwitch } from '../LangSwitch'
import { LIBRARY } from '../library'
import type { User } from '../types'
import { Demo } from './Demo'
import { Logo } from '../Logo'

export function Login({ needsCode, onDone, invite }: { needsCode: boolean; onDone: (u: User) => void; invite?: string }) {
  useLang()
  const [code, setCode] = useState('')
  const [name, setName] = useState(getUser()?.name || '')
  const [picked, setPicked] = useState<string | null>(getUser()?.color || null)
  const color = picked || colorFor(name.trim() || '?')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError(t('Escribe tu nombre para que el equipo sepa quién comenta.'))
    setBusy(true)
    setError('')
    try {
      if (needsCode) await api.login(code.trim())
      const u = { name: n, color }
      saveUser(u)
      onDone(u)
    } catch (err: any) {
      setError(err.status === 401 ? t('Código incorrecto.') : err.status === 429 ? t('Demasiados intentos, espera un minuto.') : t('No se pudo entrar.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="gate">
      <section className="gate-left">
        <header className="gate-top">
          <div className="wordmark"><Logo size={24} /></div>
          <LangSwitch />
        </header>

        <div className="gate-main">
          <h1 className="gate-title">
            <span className="mask"><span>{t('Bocetos móviles')}</span></span>
            <span className="mask"><span>{t('sin papel.')}</span></span>
          </h1>
          <p className="gate-lead">
            {invite ? t('Te invitaron a ver y comentar “{name}”. Escribe tu nombre para entrar.', { name: invite }) : t('Dibuja pantallas en minutos, conéctalas en un flujo y deja que el equipo comente justo donde importa.')}
          </p>

          <form className="gate-form" onSubmit={submit}>
            <div className="gate-fields">
              {needsCode && (
                <label className="field">
                  <span>{t('Código del equipo')}</span>
                  <input value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="current-password" required />
                </label>
              )}
              <label className="field">
                <span>{t('Tu nombre')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} required />
              </label>
            </div>
            <div className="field">
              <span>{t('Tu color')}</span>
              <div className="swatch-row" role="radiogroup" aria-label={t('Tu color')}>
                {COLORS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={c === color} className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => setPicked(c)} />
                ))}
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" disabled={busy}>{busy ? t('Entrando…') : t('Entrar')}</button>
          </form>
        </div>

        <ul className="gate-facts">
          <li><b>{LIBRARY.length}</b>{t('componentes listos')}</li>
          <li><b>{t('En vivo')}</b>{t('con todo el equipo')}</li>
          <li><b>{t('Web, tablet')}</b>{t('y teléfono')}</li>
        </ul>
      </section>

      <section className="gate-right" aria-label="Demo">
        <Demo />
      </section>
    </main>
  )
}
