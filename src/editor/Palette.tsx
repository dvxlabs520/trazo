import { memo, useMemo, useState } from 'react'
import { CATS, DEFS, LIBRARY, localProps, type Def } from '../library'
import { Icon } from '../icons'
import { t, useLang, type Lang } from '../i18n'
import { TEMPLATES, type Template } from '../templates'
import { ScreenView } from './ScreenView'
import type { El, Screen } from '../types'

const TPL_SCREEN: Screen = { id: 'tpl', name: '', x: 0, y: 0, w: 390, h: 844, device: 'iphone', bg: 'white' }
const tplEls = (tpl: Template): El[] =>
  tpl.els
    .filter(([type]) => DEFS[type])
    .map(([type, x, y, w, h, props], i) => ({ id: `${tpl.key}-${i}`, screenId: 'tpl', type, x, y, w, h, z: i, props: { ...localProps(DEFS[type].props), ...localProps(props || {}) }, link: null }))

const TplTile = memo(function TplTile({ tpl, sketch, onPick }: { tpl: Template; sketch: boolean; lang: Lang; onPick: (t: Template) => void }) {
  const s = 150 / 844
  return (
    <button className="tile tpl" onClick={() => onPick(tpl)} title={t(tpl.name)}>
      <span className="tile-prev tall">
        <span style={{ position: 'relative', width: 390 * s, height: 844 * s }}>
          <span style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${s})`, transformOrigin: '0 0' }}>
            <ScreenView screen={TPL_SCREEN} els={tplEls(tpl)} sketch={sketch} />
          </span>
        </span>
      </span>
      <span className="tile-label">{t(tpl.name)}</span>
    </button>
  )
})

const BOX_W = 112
const BOX_H = 64

function previewSize(def: Def) {
  const w = def.w === 'full' ? 390 : def.w === 'fill' ? 358 : def.w
  const h = def.h === 'full' ? 360 : def.h
  return { w, h }
}

const Tile = memo(function Tile({ def, sketch, onPointerDown }: { def: Def; sketch: boolean; lang: Lang; onPointerDown: (e: React.PointerEvent, type: string) => void }) {
  const { w, h } = previewSize(def)
  const s = Math.min(BOX_W / w, BOX_H / h, 1)
  const label = t(def.label)
  return (
    <button className="tile" onPointerDown={(e) => onPointerDown(e, def.type)} title={label} data-type={def.type}>
      <span className="tile-prev">
        <span style={{ position: 'relative', width: w * s, height: h * s }}>
          <span className={`screen-frag${sketch ? ' sketch' : ''}`} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${s})`, transformOrigin: '0 0' }}>
            <span className={`el t-${def.type}`} style={{ left: 0, top: 0, width: w, height: h }}>
              {def.render(localProps(def.props), w, h)}
            </span>
          </span>
        </span>
      </span>
      <span className="tile-label">{label}</span>
    </button>
  )
})

export function Palette({ sketch, onPointerDown, onTemplate }: { sketch: boolean; onPointerDown: (e: React.PointerEvent, type: string) => void; onTemplate: (t: Template) => void }) {
  const { lang } = useLang()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('Todos')
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return LIBRARY.filter(
      (d) => (cat === 'Todos' || d.cat === cat) && (!term || t(d.label).toLowerCase().includes(term) || d.label.toLowerCase().includes(term) || d.type.includes(term)),
    )
  }, [q, cat, lang])

  return (
    <div className="palette">
      <div className="palette-search">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Buscar entre {n} componentes', { n: LIBRARY.length })} />
      </div>
      <div className="palette-cats">
        {['Todos', 'Plantillas', ...CATS].map((c) => (
          <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>{t(c)}</button>
        ))}
      </div>
      <div className="palette-grid">
        {cat === 'Plantillas'
          ? TEMPLATES.filter((x) => !q.trim() || t(x.name).toLowerCase().includes(q.trim().toLowerCase())).map((x) => <TplTile key={x.key} tpl={x} sketch={sketch} lang={lang} onPick={onTemplate} />)
          : list.map((d) => <Tile key={d.type} def={d} sketch={sketch} lang={lang} onPointerDown={onPointerDown} />)}
        {cat !== 'Plantillas' && list.length === 0 && <p className="muted pad">{t('Nada coincide con “{q}”.', { q })}</p>}
      </div>
    </div>
  )
}
