import { memo } from 'react'
import { DEFS } from '../library'
import type { El, Screen } from '../types'
import { useLang } from '../i18n'

type Props = {
  screen: Screen
  els: El[]
  sketch: boolean
  hidden?: Set<string> | null
  proto?: boolean
  flash?: boolean
  onLink?: (screenId: string) => void
}

export const ScreenView = memo(function ScreenView({ screen, els, sketch, hidden, proto, flash, onLink }: Props) {
  useLang()
  return (
    <div
      className={`screen bg-${screen.bg || 'white'}${sketch ? ' sketch' : ''}${proto ? ' proto' : ''}${flash ? ' flash' : ''}`}
      style={{ width: screen.w, height: screen.h }}
      data-screen-id={screen.id}
    >
      {els.map((e) => {
        if (hidden?.has(e.id)) return null
        const def = DEFS[e.type]
        if (!def) return null
        const linked = !!e.link
        return (
          <div
            key={e.id}
            className={`el t-${e.type}${linked ? ' linked' : ''}`}
            data-el={e.id}
            style={{ left: e.x, top: e.y, width: e.w, height: e.h, zIndex: 1 }}
            onClick={proto && linked && onLink ? (ev) => (ev.stopPropagation(), onLink(e.link!)) : undefined}
          >
            {def.render(e.props, e.w, e.h)}
          </div>
        )
      })}
    </div>
  )
})

export function ElPreview({ el, sketch }: { el: El; sketch: boolean }) {
  const def = DEFS[el.type]
  if (!def) return null
  return (
    <div className={`screen-frag${sketch ? ' sketch' : ''}`} style={{ width: el.w, height: el.h }}>
      <div className={`el t-${el.type}`} style={{ left: 0, top: 0, width: el.w, height: el.h }}>
        {def.render(el.props, el.w, el.h)}
      </div>
    </div>
  )
}
