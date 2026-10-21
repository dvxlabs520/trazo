import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEFS, localProps } from '../library'
import { ScreenView } from '../editor/ScreenView'
import { t, useLang } from '../i18n'
import type { El, Screen } from '../types'

// A self-assembling sample of the product for the sign-in screen: real components, a flow arrow,
// a teammate's cursor and a pinned comment. The chips swap the highlighted component live.

const W = 390
const H = 844
const SLOT_Y = 262
const SLOT_MAX = 250
const TRY = ['card', 'map', 'gallery', 'calendar', 'empty']

function el(id: string, type: string, x: number, y: number, w: number, h: number, props: Record<string, any> = {}): El {
  return { id, screenId: 'a', type, x, y, w, h, z: 1, props: { ...localProps(DEFS[type].props), ...props }, link: null }
}

function mainEls(slot: string): El[] {
  const sh = Math.min(SLOT_MAX, DEFS[slot].h as number)
  return [
    el('sb', 'statusbar', 0, 0, W, 44),
    el('ab', 'appbar', 0, 44, W, 52, { back: false, action: 'bell', text: '' }),
    el('lt', 'largetitle', 16, 104, W - 32, 44),
    el('se', 'search', 16, 156, W - 32, 40),
    el('ch', 'chips', 16, 210, W - 32, 32),
    { ...el(`slot-${slot}`, slot, 16, SLOT_Y, W - 32, sh), link: 'b' },
    el('l1', 'listitem', 0, SLOT_Y + sh + 12, W, 68),
    el('l2', 'listitem', 0, SLOT_Y + sh + 80, W, 68, { text: 'Luis Gómez', sub: '09:12' }),
    el('tb', 'tabbar', 0, 728, W, 82),
    el('hb', 'homebar', 0, 810, W, 34),
  ]
}

const detailEls = (): El[] => [
  el('d1', 'statusbar', 0, 0, W, 44),
  el('d2', 'appbar', 0, 44, W, 52),
  el('d3', 'image', 0, 96, W, 300),
  el('d4', 'heading', 16, 412, W - 32, 34),
  el('d5', 'text', 16, 454, W - 32, 60),
  el('d6', 'counter', 16, 534, 120, 40),
  el('d7', 'rating', 238, 542, 128, 24),
  el('d8', 'button', 16, 744, W - 32, 48),
  el('d9', 'homebar', 0, 810, W, 34),
]

const SCREEN_A: Screen = { id: 'a', name: 'A', x: 0, y: 0, w: W, h: H, device: 'iphone', bg: 'white' }
const SCREEN_B: Screen = { id: 'b', name: 'B', x: 0, y: 0, w: W, h: H, device: 'iphone', bg: 'white' }

export function Demo() {
  useLang()
  const stage = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const [step, setStep] = useState(0)
  const [slot, setSlot] = useState('card')
  const els = mainEls(slot)

  useLayoutEffect(() => {
    const node = stage.current
    if (!node) return
    const fit = () => {
      const r = node.getBoundingClientRect()
      setScale(Math.max(0.3, Math.min(((r.height - 150) * 0.95) / H, (r.width * 0.46) / W, 0.9)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (step > els.length + 6) return
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 500 : 230)
    return () => clearTimeout(id)
  }, [step])

  const shown = els.slice(0, step)
  const built = step >= els.length
  const slotEl = els[5]
  const pw = W * scale
  const ph = H * scale
  const flowY = (SLOT_Y + slotEl.h - 40) * scale

  return (
    <div className="demo" ref={stage}>
      <div className="demo-board" style={{ width: pw * 2 + 120 * scale, height: ph }}>
        <div className="demo-phone" style={{ width: pw, height: ph }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            <ScreenView screen={SCREEN_A} els={shown} sketch={false} />
          </div>
          {built && (
            <span className="demo-pin" style={{ left: (slotEl.x + 14) * scale, top: (slotEl.y + 14) * scale }}>
              <span className="avatar sm" style={{ background: '#21b8a6' }}>LC</span>
              <span className="demo-bubble">
                <b>Lucía</b>
                {t('¿Y si la tarjeta muestra el precio más grande?')}
              </span>
            </span>
          )}
          <span className={'demo-cursor' + (built ? ' on' : '')} style={{ ['--s' as any]: scale }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 2l13 5.5-5.5 1.8L7.5 15z" fill="#ff8a3d" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            <span>Marco</span>
          </span>
        </div>

        <svg className={'demo-flow' + (built ? ' on' : '')} width={120 * scale + 40} height={ph} style={{ left: pw - 20 }}>
          <path d={`M20 ${flowY} H ${120 * scale + 14}`} fill="none" />
          <circle cx="20" cy={flowY} r="4" />
          <path d={`M${120 * scale + 6} ${flowY - 6} L${120 * scale + 14} ${flowY} L${120 * scale + 6} ${flowY + 6}`} fill="none" />
        </svg>

        <div className={'demo-phone second' + (built ? ' on' : '')} style={{ width: pw, height: ph, left: pw + 120 * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            <ScreenView screen={SCREEN_B} els={built ? detailEls() : []} sketch={false} />
          </div>
        </div>
      </div>

      <div className="demo-try">
        <span>{t('Pruébalo')}</span>
        <div className="demo-chips">
          {TRY.map((type) => (
            <button
              key={type}
              type="button"
              className={slot === type ? 'on' : ''}
              onClick={() => {
                setSlot(type)
                if (step < els.length) setStep(els.length)
              }}
            >
              {t(DEFS[type].label)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
