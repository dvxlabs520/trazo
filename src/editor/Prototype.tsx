import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { ScreenView } from './ScreenView'
import type { Snapshot } from '../store'
import { t } from '../i18n'

export function Prototype({ snap, startId, onClose }: { snap: Snapshot; startId: string; onClose: (lastId: string) => void }) {
  const [stack, setStack] = useState<string[]>([startId])
  const [flash, setFlash] = useState(false)
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight })
  const current = stack[stack.length - 1]
  const screen = snap.screens.find((s) => s.id === current) || snap.screens[0]

  useEffect(() => {
    const on = () => setVp({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(current)
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') back()
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  })

  if (!screen) return null
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  const go = (id: string) => setStack((s) => [...s, id])
  const phone = vp.w < 600
  const chrome = phone ? 0 : 120
  const scale = Math.min((vp.w - (phone ? 0 : 48)) / screen.w, (vp.h - chrome) / screen.h, phone ? 4 : 1.25)

  return (
    <div className="proto">
      <div className="proto-bar">
        <button className="icon-btn" onClick={() => onClose(current)} aria-label={t('Cerrar presentación')} title={t('Cerrar (Esc)')}><Icon name="close" size={20} /></button>
        <button className="icon-btn" onClick={back} disabled={stack.length < 2} aria-label={t('Atrás')} title={t('Atrás')}><Icon name="back" size={20} /></button>
        <span className="proto-name">{screen.name}</span>
        <select value={screen.id} onChange={(e) => go(e.target.value)} aria-label={t('Ir a pantalla')}>
          {snap.screens.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div
        className="proto-stage"
        onClick={() => {
          setFlash(true)
          setTimeout(() => setFlash(false), 450)
        }}
      >
        <div style={{ width: screen.w * scale, height: screen.h * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            <ScreenView screen={screen} els={snap.byScreen.get(screen.id) || []} sketch={snap.style === 'sketch'} proto flash={flash} onLink={go} />
          </div>
        </div>
      </div>
      {!phone && <p className="proto-hint">{t('Toca los elementos enlazados para navegar. Toca fuera para ver las zonas activas.')}</p>}
    </div>
  )
}
