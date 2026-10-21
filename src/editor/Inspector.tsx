import { DEFS, type Field } from '../library'
import { Icon } from '../icons'
import { DEVICES, type El } from '../types'
import type { Snapshot, Store } from '../store'
import { t, useLang } from '../i18n'
import { LangSwitch } from '../LangSwitch'
import { IconListPicker, IconPicker } from './IconPicker'

export type Selection = { kind: 'els'; ids: string[] } | { kind: 'screen'; id: string } | null

type Props = {
  store: Store
  snap: Snapshot
  sel: Selection
  setSel: (s: Selection) => void
  activeScreen: string | null
  onExport: (screenId: string) => void
  onPresent: (screenId: string) => void
  onAddScreen: (device: string) => void
}

export function Inspector({ store, snap, sel, setSel, activeScreen, onExport, onPresent, onAddScreen }: Props) {
  useLang()
  if (sel?.kind === 'els') {
    const els = sel.ids.map((id) => store.els.get(id)).filter(Boolean) as El[]
    if (els.length === 1) return <ElInspector store={store} snap={snap} el={els[0]} setSel={setSel} />
    if (els.length > 1)
      return (
        <div className="insp">
          <div className="insp-head"><b>{t('{n} elementos', { n: els.length })}</b></div>
          <div className="insp-actions">
            <button onClick={() => setSel({ kind: 'els', ids: store.duplicateEls(els.map((e) => e.id)) })}><Icon name="copy" size={16} />{t('Duplicar')}</button>
            <button
              onClick={() => {
                const patches: Record<string, Partial<El>> = {}
                for (const e of els) {
                  const s = store.screens.get(e.screenId)
                  if (s) patches[e.id] = { x: Math.round((s.w - e.w) / 2) }
                }
                store.updateEls(patches)
              }}
            >
              {t('Centrar')}
            </button>
            <button className="danger" onClick={() => (store.deleteEls(els.map((e) => e.id)), setSel(null))}><Icon name="trash" size={16} />{t('Eliminar')}</button>
          </div>
        </div>
      )
  }

  if (sel?.kind === 'screen') {
    const s = store.screens.get(sel.id)
    if (s) {
      const isStart = snap.start === s.id
      return (
        <div className="insp">
          <div className="insp-head"><b>{t('Pantalla')}</b></div>
          <label className="f">
            <span>{t('Nombre')}</span>
            <input value={s.name} onChange={(e) => store.updateScreen(s.id, { name: e.target.value })} />
          </label>
          <label className="f">
            <span>{t('Dispositivo')}</span>
            <select value={s.device} onChange={(e) => store.updateScreen(s.id, { device: e.target.value })}>
              {Object.entries(DEVICES).map(([k, d]) => <option key={k} value={k}>{t(d.label)} · {d.w}×{d.h}</option>)}
            </select>
          </label>
          <label className="f">
            <span>{t('Fondo')}</span>
            <div className="seg">
              {(['white', 'light', 'dark'] as const).map((b) => (
                <button key={b} className={(s.bg || 'white') === b ? 'on' : ''} onClick={() => store.updateScreen(s.id, { bg: b })}>
                  {t({ white: 'Blanco', light: 'Gris', dark: 'Oscuro' }[b])}
                </button>
              ))}
            </div>
          </label>
          <label className="check">
            <input type="checkbox" checked={isStart} onChange={() => store.setStart(s.id)} />
            <span>{t('Pantalla inicial del flujo')}</span>
          </label>
          <div className="insp-actions col">
            <button onClick={() => onPresent(s.id)}><Icon name="play" size={16} />{t('Presentar desde aquí')}</button>
            <button onClick={() => { const id = store.duplicateScreen(s.id); if (id) setSel({ kind: 'screen', id }) }}><Icon name="copy" size={16} />{t('Duplicar pantalla')}</button>
            <button onClick={() => onExport(s.id)}><Icon name="download" size={16} />{t('Exportar PNG')}</button>
            <button className="danger" onClick={() => confirm(t('¿Eliminar "{name}"?', { name: s.name })) && (store.deleteScreen(s.id), setSel(null))}><Icon name="trash" size={16} />{t('Eliminar pantalla')}</button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="insp">
      <div className="insp-head"><b>{t('Proyecto')}</b></div>
      <label className="f">
        <span>{t('Estilo de los bocetos')}</span>
        <div className="seg">
          <button className={snap.style === 'clean' ? 'on' : ''} onClick={() => store.setStyle('clean')}>{t('Limpio')}</button>
          <button className={snap.style === 'sketch' ? 'on' : ''} onClick={() => store.setStyle('sketch')}>{t('A mano')}</button>
        </div>
      </label>
      <div className="f">
        <span>{t('Añadir pantalla')}</span>
        <div className="insp-actions col">
          {Object.entries(DEVICES).map(([k, d]) => (
            <button key={k} onClick={() => onAddScreen(k)}><Icon name="phone" size={16} />{t(d.label)} <small>{d.w}×{d.h}</small></button>
          ))}
        </div>
      </div>
      {activeScreen && store.screens.get(activeScreen) ? (
        <button className="linkish" onClick={() => setSel({ kind: 'screen', id: activeScreen })}>{t('Ajustes de “{name}”', { name: store.screens.get(activeScreen)!.name })}</button>
      ) : null}
      <div className="f">
        <span>{t('Idioma')}</span>
        <LangSwitch wide />
      </div>
      <div className="tips">
        <p>{t('Toca un componente para añadirlo debajo del último, o arrástralo a cualquier pantalla.')}</p>
        <p>{t('Para crear un flujo, elige un botón y en “Al tocar, ir a” selecciona la pantalla destino.')}</p>
        <p className="kbd-tips">{t('Atajos: V seleccionar · H mano · C comentar · P presentar · ⌘D duplicar · ⌘Z deshacer')}</p>
      </div>
    </div>
  )
}

function ElInspector({ store, snap, el, setSel }: { store: Store; snap: Snapshot; el: El; setSel: (s: Selection) => void }) {
  const def = DEFS[el.type]
  const num = (k: 'x' | 'y' | 'w' | 'h') => (
    <label className="f mini">
      <span>{k.toUpperCase()}</span>
      <input
        type="number"
        inputMode="numeric"
        value={Math.round(el[k])}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!isNaN(v)) store.updateEl(el.id, { [k]: k === 'w' || k === 'h' ? Math.max(4, v) : v })
        }}
      />
    </label>
  )
  return (
    <div className="insp">
      <div className="insp-head">
        <b>{def ? t(def.label) : el.type}</b>
        <span className="insp-head-tools">
          <button className="icon-btn" title={t('Duplicar (⌘D)')} aria-label={t('Duplicar')} onClick={() => setSel({ kind: 'els', ids: store.duplicateEls([el.id]) })}><Icon name="copy" size={17} /></button>
          <button className="icon-btn" title={t('Traer al frente')} aria-label={t('Traer al frente')} onClick={() => store.bringToFront(el.id)}><Icon name="front" size={17} /></button>
          <button className="icon-btn" title={t('Enviar al fondo')} aria-label={t('Enviar al fondo')} onClick={() => store.sendToBack(el.id)}><Icon name="backward" size={17} /></button>
          <button className="icon-btn danger" title={t('Eliminar')} aria-label={t('Eliminar')} onClick={() => (store.deleteEls([el.id]), setSel(null))}><Icon name="trash" size={17} /></button>
        </span>
      </div>

      <label className="f flow">
        <span><Icon name="link" size={15} /> {t('Al tocar, ir a')}</span>
        <select value={el.link || ''} onChange={(e) => store.updateEl(el.id, { link: e.target.value || null })}>
          <option value="">{t('Ninguna pantalla')}</option>
          {snap.screens.filter((s) => s.id !== el.screenId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>

      {def?.fields.map((f) => <FieldInput key={f.key} f={f} value={el.props[f.key]} props={el.props} onChange={(v) => store.setProp(el.id, f.key, v)} />)}

      <div className="f">
        <span>{t('Posición y tamaño')}</span>
        <div className="grid4">{num('x')}{num('y')}{num('w')}{num('h')}</div>
      </div>
    </div>
  )
}

function FieldInput({ f, value, props, onChange }: { f: Field; value: any; props: Record<string, any>; onChange: (v: any) => void }) {
  if (f.kind === 'icon') return <IconPicker label={t(f.label)} value={value} onChange={onChange} allowNone />
  if (f.kind === 'icons') return <IconListPicker label={t(f.label)} items={props.items} icons={value} onChange={onChange} />
  if (f.kind === 'bool')
    return (
      <label className="check">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{t(f.label)}</span>
      </label>
    )
  if (f.kind === 'range')
    return (
      <label className="f">
        <span>{t(f.label)} <em>{value}</em></span>
        <input type="range" min={f.min ?? 0} max={f.max ?? 100} value={Number(value) || 0} onChange={(e) => onChange(Number(e.target.value))} />
      </label>
    )
  if (f.kind === 'select') {
    const opts = f.options || []
    return (
      <label className="f">
        <span>{t(f.label)}</span>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {opts.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
        </select>
      </label>
    )
  }
  if (f.kind === 'textarea')
    return (
      <label className="f">
        <span>{t(f.label)}</span>
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  return (
    <label className="f">
      <span>{t(f.label)}</span>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
