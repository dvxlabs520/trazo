import { useState } from 'react'
import { Icon, ICON_NAMES } from '../icons'
import { t } from '../i18n'

// Visual icon choice: a button showing the current icon that opens a tappable grid.
export function IconPicker({ value, onChange, allowNone, label }: { value: string; onChange: (v: string) => void; allowNone?: boolean; label: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const none = !value || value === 'none'
  const list = ICON_NAMES.filter((n) => !q || n.includes(q.trim().toLowerCase()))
  return (
    <div className="f">
      <span>{label}</span>
      <button type="button" className={'icon-pick' + (open ? ' open' : '')} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="icon-pick-cur">{none ? <Icon name="close" size={16} style={{ opacity: 0.4 }} /> : <Icon name={value} size={22} />}</span>
        <span>{none ? t('Ninguno') : t('Cambiar icono')}</span>
        <Icon name="down" size={16} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div className="icon-grid-wrap">
          <input className="icon-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Buscar')} />
          <div className="icon-grid">
            {allowNone && (
              <button type="button" className={none ? 'on' : ''} onClick={() => (onChange('none'), setOpen(false))} title={t('Ninguno')}>
                <Icon name="close" size={18} style={{ opacity: 0.5 }} />
              </button>
            )}
            {list.map((n) => (
              <button key={n} type="button" className={value === n ? 'on' : ''} onClick={() => (onChange(n), setOpen(false))} title={n}>
                <Icon name={n} size={22} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// One icon per item of a comma list (tab bar, toolbar…), each picked visually.
export function IconListPicker({ items, icons, onChange, label }: { items: string; icons: string; onChange: (v: string) => void; label: string }) {
  const names = String(items || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean)
  const cur = String(icons || '').split(',').map((x) => x.trim())
  const [open, setOpen] = useState<number | null>(null)
  const set = (i: number, n: string) => {
    const next = names.map((_, k) => cur[k] || 'star')
    next[i] = n
    onChange(next.join(', '))
    setOpen(null)
  }
  return (
    <div className="f">
      <span>{label}</span>
      <div className="icon-list">
        {names.map((nm, i) => (
          <button key={i} type="button" className={'icon-list-item' + (open === i ? ' open' : '')} onClick={() => setOpen(open === i ? null : i)}>
            <Icon name={cur[i] || 'star'} size={20} />
            <small>{nm}</small>
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="icon-grid-wrap">
          <div className="icon-grid">
            {ICON_NAMES.map((n) => (
              <button key={n} type="button" className={cur[open] === n ? 'on' : ''} onClick={() => set(open, n)} title={n}>
                <Icon name={n} size={22} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
