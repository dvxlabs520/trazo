import { useCallback, useEffect, useRef, useState } from 'react'
import { api, COLORS, initials } from '../api'
import { navigate } from '../main'
import { Icon } from '../icons'
import { DEFS } from '../library'
import { Store, usePeers, useSnapshot, type Peer, type Snapshot } from '../store'
import type { El, Screen, User } from '../types'
import { ElPreview, ScreenView } from './ScreenView'
import { Palette } from './Palette'
import { Inspector, type Selection } from './Inspector'
import { CommentPopover, CommentsPanel } from './Comments'
import { Prototype } from './Prototype'
import type { Template } from '../templates'
import { Logo } from '../Logo'
import { t, useLang } from '../i18n'

type Tool = 'select' | 'hand' | 'comment'
type View = { x: number; y: number; z: number }
type Pt = { x: number; y: number }
type Gesture = {
  kind: 'pan' | 'move' | 'resize' | 'screen' | 'palette'
  sx: number
  sy: number
  moved: boolean
  touch: boolean
  v0?: View
  tap?: () => void
  ids?: string[]
  primary?: El
  screen?: Screen
  dir?: string
  type?: string
}
type Drag =
  | { kind: 'els'; vis: { el: El; wx: number; wy: number }[]; hidden: Set<string>; screenIds: Set<string>; guide: number | null }
  | { kind: 'screen'; id: string; dx: number; dy: number }

const MIN_Z = 0.1
const MAX_Z = 4
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z))
const round = (n: number, g = 4) => Math.round(n / g) * g
const isTyping = (t: EventTarget | null, key: string) => {
  const el = t as HTMLElement | null
  if (!el) return false
  // a focused <select> only needs arrows/enter/space; letter shortcuts still work
  if (el.tagName === 'SELECT') return key.startsWith('Arrow') || key === 'Enter' || key === ' '
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches)
  useEffect(() => {
    const mq = matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

type EditorProps = { projectId: string; user: User; share?: string; shareName?: string; onUserChange: (u: User) => void }

export function Editor({ projectId, user, share, shareName, onUserChange }: EditorProps) {
  const [store, setStore] = useState<Store | null>(null)
  useEffect(() => {
    const s = new Store(projectId, user, share || null)
    setStore(s)
    return () => s.destroy()
  }, [projectId, user.name, share])
  useEffect(() => {
    if (store && store.user.color !== user.color) store.setUser(user)
  }, [store, user.color])
  if (!store) return <div className="boot" />
  return <EditorInner store={store} projectId={projectId} readOnly={!!share} shareName={shareName} onUserChange={onUserChange} />
}

function EditorInner({ store, projectId, readOnly, shareName, onUserChange }: { store: Store; projectId: string; readOnly: boolean; shareName?: string; onUserChange: (u: User) => void }) {
  useLang()
  const snap = useSnapshot(store)
  const narrow = useMedia('(max-width: 899px)')
  const coarse = useMedia('(pointer: coarse)')

  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [sel, setSelState] = useState<Selection>(null)
  const [active, setActive] = useState<string | null>(null)
  const [drag, setDragState] = useState<Drag | null>(null)
  const [ghost, setGhost] = useState<{ type: string; x: number; y: number } | null>(null)
  const [panel, setPanel] = useState<null | 'add' | 'props' | 'comments'>(null)
  const [rightTab, setRightTab] = useState<'props' | 'comments'>('props')
  const [proto, setProto] = useState<string | null>(null)
  const [openC, setOpenC] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ screenId: string | null; x: number; y: number } | null>(null)
  const [showResolved, setShowResolved] = useState(false)
  const [showFlows, setShowFlows] = useState(true)
  const [name, setName] = useState('')
  const [toast, setToast] = useState('')
  const [missing, setMissing] = useState(false)
  const [dialog, setDialog] = useState<null | 'share' | 'me'>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const snapRef = useRef<Snapshot>(snap)
  snapRef.current = snap
  const dragRef = useRef<Drag | null>(null)
  const gRef = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const pinch = useRef<{ d0: number; c0: Pt; v0: View } | null>(null)
  const spaceDown = useRef(false)
  const clip = useRef<El[]>([])
  const fitted = useRef(false)
  const lastCursor = useRef(0)

  const lastDragSent = useRef(0)
  const setDrag = (d: Drag | null) => {
    dragRef.current = d
    setDragState(d)
    // share the in-progress move with teammates so they see it live
    const now = performance.now()
    if (d && now - lastDragSent.current < 50) return
    lastDragSent.current = now
    store.setDragPresence(
      !d ? null : d.kind === 'screen' ? { screen: { id: d.id, dx: d.dx, dy: d.dy } } : { els: d.vis.map((v) => ({ id: v.el.id, wx: v.wx, wy: v.wy, w: v.el.w, h: v.el.h })) },
    )
  }

  const selIds = sel?.kind === 'els' ? sel.ids.filter((id) => store.els.has(id)) : []
  const selEl = selIds.length === 1 ? store.els.get(selIds[0]) || null : null

  const setSel = useCallback(
    (s: Selection) => {
      setSelState(s)
      store.setSel(s?.kind === 'els' ? s.ids[0] ?? null : null)
      if (s?.kind === 'screen') setActive(s.id)
      if (s?.kind === 'els') {
        const e = store.els.get(s.ids[0])
        if (e) setActive(e.screenId)
      }
    },
    [store],
  )

  // ---------- project name ----------
  useEffect(() => {
    if (readOnly) {
      setName(shareName || '')
      document.title = `${shareName} · Trazo`
      return
    }
    api.project(projectId).then(
      (p) => {
        setName(p.name)
        document.title = `${p.name} · Trazo`
      },
      () => setMissing(true),
    )
    return () => {
      document.title = 'Trazo'
    }
  }, [projectId])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  // ---------- view helpers ----------
  const rect = () => canvasRef.current!.getBoundingClientRect()
  const toWorld = (cx: number, cy: number): Pt => {
    const r = rect()
    const v = viewRef.current
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z }
  }
  const screenAt = (p: Pt) => {
    const list = snapRef.current.screens
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]
      if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return s
    }
    return null
  }
  const zoomAt = (cx: number, cy: number, z: number) => {
    const v = viewRef.current
    const nz = clampZ(z)
    const wx = (cx - v.x) / v.z
    const wy = (cy - v.y) / v.z
    setView({ z: nz, x: cx - wx * nz, y: cy - wy * nz })
  }
  const fitTo = (b: { x: number; y: number; w: number; h: number }, maxZ = 1) => {
    const el = canvasRef.current
    if (!el) return
    const W = el.clientWidth
    const H = el.clientHeight
    const pad = narrow ? 24 : 64
    const z = clampZ(Math.min((W - pad * 2) / b.w, (H - pad * 2 - 30) / b.h, maxZ))
    setView({ z, x: (W - b.w * z) / 2 - b.x * z, y: (H - b.h * z) / 2 - b.y * z + 12 })
  }
  const fitAll = () => {
    const ss = snapRef.current.screens
    if (!ss.length) return setView({ x: 40, y: 60, z: 1 })
    const x = Math.min(...ss.map((s) => s.x))
    const y = Math.min(...ss.map((s) => s.y))
    const r = Math.max(...ss.map((s) => s.x + s.w))
    const b = Math.max(...ss.map((s) => s.y + s.h))
    fitTo({ x, y, w: r - x, h: b - y })
  }
  const fitScreen = (id: string) => {
    const s = store.screens.get(id)
    if (s) fitTo(s, 2)
  }

  // first sync: seed an empty project and fit
  useEffect(() => {
    if (!store.synced || fitted.current) return
    fitted.current = true
    if (store.screens.size === 0 && !readOnly) {
      const id = store.addScreen('iphone', t('Inicio'))
      store.addEl(id, 'statusbar')
      store.addEl(id, 'homebar')
      store.undo.clear()
      setActive(id)
    }
    requestAnimationFrame(() => {
      fitAll()
      const present = new URLSearchParams(location.search).get('present')
      if (present !== null) {
        const ss = snapRef.current
        setProto(ss.screens.find((s) => s.id === present)?.id || ss.start || ss.screens[0]?.id || null)
      }
    })
  }, [store.synced])

  const targetScreen = () => {
    if (active && store.screens.has(active)) return active
    const ss = snapRef.current.screens
    if (!ss.length) return null
    const el = canvasRef.current!
    const c = toWorld(rect().left + el.clientWidth / 2, rect().top + el.clientHeight / 2)
    let best = ss[0]
    let bd = Infinity
    for (const s of ss) {
      const d = Math.hypot(s.x + s.w / 2 - c.x, s.y + s.h / 2 - c.y)
      if (d < bd) (bd = d), (best = s)
    }
    return best.id
  }

  const ensureVisible = (id: string) => {
    const e = store.els.get(id)
    const s = e && store.screens.get(e.screenId)
    const el = canvasRef.current
    if (!e || !s || !el) return
    const v = viewRef.current
    const top = (s.y + e.y) * v.z + v.y
    const bottom = (s.y + e.y + e.h) * v.z + v.y
    const H = el.clientHeight
    if (top < 0 || bottom > H) setView({ ...v, y: v.y + (H / 2 - (top + bottom) / 2) })
  }

  const addComponent = (type: string, client?: Pt) => {
    let screenId: string | null
    let local: Pt | undefined
    if (client) {
      const w = toWorld(client.x, client.y)
      const s = screenAt(w)
      if (!s) return flash(t('Suelta el componente dentro de una pantalla'))
      screenId = s.id
      local = { x: w.x - s.x, y: w.y - s.y }
    } else {
      screenId = targetScreen()
      if (!screenId) {
        screenId = store.addScreen('iphone')
        requestAnimationFrame(fitAll)
      }
    }
    const id = store.addEl(screenId, type, local)
    if (id) {
      setSel({ kind: 'els', ids: [id] })
      setTool('select')
      if (narrow) {
        setPanel(null)
        requestAnimationFrame(() => ensureVisible(id))
      }
    }
  }

  const addScreen = (device: string) => {
    const id = store.addScreen(device)
    setSel({ kind: 'screen', id })
    requestAnimationFrame(() => fitScreen(id))
  }

  const addTemplate = (tpl: Template) => {
    const id = store.addTemplate(t(tpl.name), tpl.els)
    setSel({ kind: 'screen', id })
    setTool('select')
    if (narrow) setPanel(null)
    requestAnimationFrame(() => fitScreen(id))
  }

  const openDraft = (cx: number, cy: number) => {
    const w = toWorld(cx, cy)
    const s = screenAt(w)
    setOpenC(null)
    setDraft({ screenId: s?.id ?? null, x: s ? w.x - s.x : w.x, y: s ? w.y - s.y : w.y })
  }

  // ---------- pointer gestures ----------
  function onDown(e: React.PointerEvent) {
    if (e.button === 2) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      if (dragRef.current) setDrag(null)
      gRef.current = null
      pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, c0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: viewRef.current }
      return
    }
    if (pointers.current.size > 2) return
    const t = e.target as HTMLElement
    const touch = e.pointerType !== 'mouse'
    const base = { sx: e.clientX, sy: e.clientY, moved: false, touch }
    const pan = (tap?: () => void): Gesture => ({ kind: 'pan', ...base, v0: viewRef.current, tap })
    const closePops = () => {
      setOpenC(null)
      setDraft(null)
    }

    if (tool === 'hand' || e.button === 1 || spaceDown.current) {
      gRef.current = pan()
      return
    }
    if (tool === 'comment') {
      gRef.current = pan(() => openDraft(e.clientX, e.clientY))
      return
    }
    if (readOnly) {
      closePops()
      const scr = t.closest<HTMLElement>('[data-screen-id]')
      gRef.current = pan(() => scr && setActive(scr.dataset.screenId!))
      return
    }
    const handle = t.closest<HTMLElement>('[data-handle]')
    if (handle && selEl) {
      gRef.current = { kind: 'resize', ...base, primary: selEl, screen: store.screens.get(selEl.screenId), dir: handle.dataset.handle }
      return
    }
    const title = t.closest<HTMLElement>('[data-screen-title]')
    if (title) {
      const id = title.dataset.screenTitle!
      closePops()
      setSel({ kind: 'screen', id })
      gRef.current = { kind: 'screen', ...base, screen: store.screens.get(id) }
      return
    }
    const node = t.closest<HTMLElement>('[data-el]')
    if (node) {
      const id = node.dataset.el!
      const el = store.els.get(id)
      if (!el) return
      closePops()
      const already = selIds.includes(id)
      if (touch && !already) {
        gRef.current = pan(() => setSel({ kind: 'els', ids: [id] }))
        return
      }
      if (e.shiftKey) {
        const ids = already ? selIds.filter((x) => x !== id) : [...selIds, id]
        setSel(ids.length ? { kind: 'els', ids } : null)
        return
      }
      const ids = already ? selIds : [id]
      if (!already) setSel({ kind: 'els', ids })
      gRef.current = { kind: 'move', ...base, ids, primary: el, screen: store.screens.get(el.screenId) }
      return
    }
    const scr = t.closest<HTMLElement>('[data-screen-id]')
    closePops()
    if (scr) {
      const id = scr.dataset.screenId!
      gRef.current = pan(() => setSel({ kind: 'screen', id }))
    } else {
      gRef.current = pan(() => setSel(null))
    }
  }

  function onPaletteDown(e: React.PointerEvent, type: string) {
    if (e.button !== 0) return
    gRef.current = { kind: 'palette', sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType !== 'mouse', type }
  }

  const handlers = useRef({ move: (_e: PointerEvent) => {}, up: (_e: PointerEvent, _cancel: boolean) => {} })
  handlers.current.move = (e: PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values())
      const { d0, c0, v0 } = pinch.current
      const r = rect()
      const z = clampZ((v0.z * Math.hypot(a.x - b.x, a.y - b.y)) / d0)
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const wx = (c0.x - r.left - v0.x) / v0.z
      const wy = (c0.y - r.top - v0.y) / v0.z
      setView({ z, x: c.x - r.left - wx * z, y: c.y - r.top - wy * z })
      return
    }
    const g = gRef.current
    if (!g) return
    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy
    if (!g.moved) {
      if (Math.hypot(dx, dy) < (g.touch ? 8 : 3)) return
      g.moved = true
    }
    const z = viewRef.current.z
    if (g.kind === 'pan') {
      setView({ ...g.v0!, x: g.v0!.x + dx, y: g.v0!.y + dy })
    } else if (g.kind === 'palette') {
      setGhost({ type: g.type!, x: e.clientX, y: e.clientY })
    } else if (g.kind === 'screen') {
      setDrag({ kind: 'screen', id: g.screen!.id, dx: round(dx / z, 8), dy: round(dy / z, 8) })
    } else if (g.kind === 'move') {
      const p = g.primary!
      const s = g.screen!
      const th = 6 / z
      let nx = p.x + dx / z
      let ny = p.y + dy / z
      let guide: number | null = null
      const xs: [number, number][] = [
        [(s.w - p.w) / 2, s.x + s.w / 2],
        [0, s.x],
        [16, s.x + 16],
        [s.w - 16 - p.w, s.x + s.w - 16],
        [s.w - p.w, s.x + s.w],
      ]
      const hit = xs.find(([t]) => Math.abs(nx - t) < th)
      if (hit) {
        nx = hit[0]
        guide = hit[1]
      } else nx = round(nx)
      const ys = [0, s.h - p.h]
      const hy = ys.find((t) => Math.abs(ny - t) < th)
      ny = hy !== undefined ? hy : round(ny)
      const ddx = nx - p.x
      const ddy = ny - p.y
      const vis = g.ids!.map((id) => store.els.get(id)).filter(Boolean).map((el) => {
        const sc = store.screens.get(el!.screenId)!
        return { el: el!, wx: sc.x + el!.x + ddx, wy: sc.y + el!.y + ddy }
      })
      setDrag({ kind: 'els', vis, hidden: new Set(g.ids), screenIds: new Set(vis.map((v) => v.el.screenId)), guide })
    } else if (g.kind === 'resize') {
      const p = g.primary!
      const s = g.screen!
      const d = g.dir!
      let { x, y, w, h } = p
      const wdx = dx / z
      const wdy = dy / z
      if (d.includes('e')) w = Math.max(8, round(p.w + wdx))
      if (d.includes('s')) h = Math.max(4, round(p.h + wdy))
      if (d.includes('w')) {
        const nx = Math.min(p.x + p.w - 8, round(p.x + wdx))
        w = p.w + (p.x - nx)
        x = nx
      }
      if (d.includes('n')) {
        const ny = Math.min(p.y + p.h - 4, round(p.y + wdy))
        h = p.h + (p.y - ny)
        y = ny
      }
      const el = { ...p, x, y, w, h }
      setDrag({ kind: 'els', vis: [{ el, wx: s.x + x, wy: s.y + y }], hidden: new Set([p.id]), screenIds: new Set([p.screenId]), guide: null })
    }
  }
  handlers.current.up = (e: PointerEvent, cancel: boolean) => {
    pointers.current.delete(e.pointerId)
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null
      gRef.current = null
      return
    }
    const g = gRef.current
    gRef.current = null
    if (!g) return
    if (cancel) {
      setDrag(null)
      setGhost(null)
      return
    }
    if (!g.moved) {
      if (g.kind === 'palette') addComponent(g.type!)
      else g.tap?.()
      return
    }
    const d = dragRef.current
    if (g.kind === 'palette') {
      setGhost(null)
      const r = rect()
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) addComponent(g.type!, { x: e.clientX, y: e.clientY })
    } else if (g.kind === 'screen' && d?.kind === 'screen') {
      const s = store.screens.get(d.id)
      if (s) store.updateScreen(d.id, { x: s.x + d.dx, y: s.y + d.dy })
    } else if ((g.kind === 'move' || g.kind === 'resize') && d?.kind === 'els') {
      const prim = d.vis[0]
      const target = g.kind === 'move' ? screenAt({ x: prim.wx + prim.el.w / 2, y: prim.wy + Math.min(prim.el.h / 2, 20) }) : store.screens.get(prim.el.screenId)
      if (target) {
        const patches: Record<string, Partial<El>> = {}
        for (const v of d.vis) {
          patches[v.el.id] = { screenId: target.id, x: Math.round(v.wx - target.x), y: Math.round(v.wy - target.y), w: v.el.w, h: v.el.h }
        }
        store.updateEls(patches)
        setActive(target.id)
      }
    }
    setDrag(null)
  }

  useEffect(() => {
    const m = (e: PointerEvent) => handlers.current.move(e)
    const u = (e: PointerEvent) => handlers.current.up(e, false)
    const c = (e: PointerEvent) => handlers.current.up(e, true)
    addEventListener('pointermove', m)
    addEventListener('pointerup', u)
    addEventListener('pointercancel', c)
    return () => {
      removeEventListener('pointermove', m)
      removeEventListener('pointerup', u)
      removeEventListener('pointercancel', c)
    }
  }, [])

  // wheel + safari trackpad pinch
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const v = viewRef.current
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, v.z * Math.exp(-e.deltaY * 0.01))
      else setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY })
    }
    let gz = 1
    const gs = (e: any) => {
      e.preventDefault()
      gz = viewRef.current.z
    }
    const gc = (e: any) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, gz * e.scale)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('gesturestart', gs)
    el.addEventListener('gesturechange', gc)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('gesturestart', gs)
      el.removeEventListener('gesturechange', gc)
    }
  }, [])

  // cursor presence
  const onHover = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const now = performance.now()
    if (now - lastCursor.current < 40) return
    lastCursor.current = now
    store.setCursor(toWorld(e.clientX, e.clientY))
  }

  // ---------- keyboard ----------
  const keys = useRef((_e: KeyboardEvent) => {})
  keys.current = (e: KeyboardEvent) => {
    if (proto || isTyping(e.target, e.key)) return
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    if (readOnly) {
      if (e.key === 'Escape') (setOpenC(null), setDraft(null), setTool('select'))
      else if (!mod && k === 'c') setTool('comment')
      else if (!mod && (k === 'v' || k === 'h')) setTool('select')
      else if (!mod && k === 'p') present()
      return
    }
    if (mod && k === 'z') {
      e.preventDefault()
      e.shiftKey ? store.undo.redo() : store.undo.undo()
    } else if (mod && k === 'y') {
      e.preventDefault()
      store.undo.redo()
    } else if (mod && k === 'd' && selIds.length) {
      e.preventDefault()
      setSel({ kind: 'els', ids: store.duplicateEls(selIds) })
    } else if (mod && k === 'c' && selIds.length) {
      clip.current = selIds.map((id) => store.els.get(id)!).filter(Boolean)
    } else if (mod && k === 'v' && clip.current.length) {
      const target = targetScreen()
      if (target) setSel({ kind: 'els', ids: store.pasteEls(clip.current, target) })
    } else if (mod && k === 'a') {
      e.preventDefault()
      const sid = active || targetScreen()
      if (sid) setSel({ kind: 'els', ids: (snap.byScreen.get(sid) || []).map((x) => x.id) })
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selIds.length) {
      e.preventDefault()
      store.deleteEls(selIds)
      setSel(null)
    } else if (e.key.startsWith('Arrow') && selIds.length) {
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const ddx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const ddy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      const patches: Record<string, Partial<El>> = {}
      for (const id of selIds) {
        const el = store.els.get(id)
        if (el) patches[id] = { x: el.x + ddx, y: el.y + ddy }
      }
      store.updateEls(patches)
    } else if (e.key === 'Escape') {
      setSel(null)
      setOpenC(null)
      setDraft(null)
      setTool('select')
    } else if (e.key === ' ' && !e.repeat) {
      e.preventDefault()
      spaceDown.current = true
      canvasRef.current?.classList.add('space')
    } else if (!mod && k === 'v') setTool('select')
    else if (!mod && k === 'h') setTool('hand')
    else if (!mod && k === 'c') setTool('comment')
    else if (!mod && k === 'p') present()
    else if (!mod && (e.key === '+' || e.key === '=')) zoomBy(1.25)
    else if (!mod && e.key === '-') zoomBy(0.8)
    else if (e.shiftKey && e.code === 'Digit1') fitAll()
    else if (!mod && e.key === '0') zoomBy(1 / viewRef.current.z)
  }
  useEffect(() => {
    const d = (e: KeyboardEvent) => keys.current(e)
    const u = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        spaceDown.current = false
        canvasRef.current?.classList.remove('space')
      }
    }
    addEventListener('keydown', d)
    addEventListener('keyup', u)
    return () => {
      removeEventListener('keydown', d)
      removeEventListener('keyup', u)
    }
  }, [])

  const zoomBy = (f: number) => {
    const el = canvasRef.current
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, viewRef.current.z * f)
  }

  function present(from?: string) {
    const id = from || (sel?.kind === 'screen' ? sel.id : null) || selEl?.screenId || snap.start || snap.screens[0]?.id
    if (id) setProto(id)
  }

  async function exportPng(id: string) {
    const node = canvasRef.current?.querySelector<HTMLElement>(`[data-screen-id="${id}"]`)
    const s = store.screens.get(id)
    if (!node || !s) return
    flash(t('Generando imagen…'))
    const { toPng } = await import('html-to-image')
    const url = await toPng(node, { pixelRatio: 2, skipFonts: snap.style !== 'sketch' }).catch(() => toPng(node, { pixelRatio: 2, skipFonts: true }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${s.name}.png`
    a.click()
  }

  async function exportPdf() {
    flash(t('Generando PDF…'))
    try {
      const { exportProjectPdf } = await import('./pdf')
      await exportProjectPdf(name || 'Trazo', snap, canvasRef.current!)
    } catch (e) {
      console.error(e)
      flash(t('No se pudo generar el PDF'))
    }
  }

  const followPeer = (p: Peer) => {
    const el = canvasRef.current
    if (!el) return
    let target: Pt | null = p.cursor || null
    if (!target && p.sel) {
      const e = store.els.get(p.sel)
      const s = e && store.screens.get(e.screenId)
      if (e && s) target = { x: s.x + e.x + e.w / 2, y: s.y + e.y + e.h / 2 }
    }
    if (!target) return flash(t('{name} no está mirando ninguna pantalla', { name: p.user.name }))
    const v = viewRef.current
    setView({ ...v, x: el.clientWidth / 2 - target.x * v.z, y: el.clientHeight / 2 - target.y * v.z })
  }

  // ---------- render helpers ----------
  const z = view.z
  const openComment = openC ? snap.comments.find((c) => c.id === openC) || null : null
  const commentWorld = (c: { screenId: string | null; x: number; y: number }) => {
    const s = c.screenId ? store.screens.get(c.screenId) : null
    if (c.screenId && !s) return null
    return { x: (s?.x || 0) + c.x, y: (s?.y || 0) + c.y }
  }
  const toScreenPt = (p: Pt) => ({ x: p.x * z + view.x, y: p.y * z + view.y })
  const openCount = snap.comments.filter((c) => !c.resolved).length

  const popoverStyle = (p: Pt | null): React.CSSProperties => {
    if (!p || narrow) return {}
    const el = canvasRef.current
    const W = el?.clientWidth || 800
    const H = el?.clientHeight || 600
    const sp = toScreenPt(p)
    const left = sp.x + 360 > W ? sp.x - 330 : sp.x + 40
    return { left: Math.max(8, left), top: Math.min(Math.max(8, sp.y - 30), H - 320) }
  }

  const screenOffset = (s: Screen) => (drag?.kind === 'screen' && drag.id === s.id ? { x: s.x + drag.dx, y: s.y + drag.dy } : { x: s.x, y: s.y })
  const handleSize = (coarse ? 20 : 9) / z

  if (missing)
    return (
      <main className="notfound">
        <div>
          <div className="wordmark">Trazo</div>
          <p className="gate-lead">{t('Este proyecto no existe o fue eliminado.')}</p>
          <button className="btn primary" onClick={() => navigate('/')}>{t('Ver proyectos')}</button>
        </div>
      </main>
    )

  const inspector = (
    <Inspector
      store={store}
      snap={snap}
      sel={sel}
      setSel={setSel}
      activeScreen={active}
      onExport={exportPng}
      onPresent={(id) => present(id)}
      onAddScreen={addScreen}
    />
  )
  const commentsPanel = (
    <CommentsPanel
      store={store}
      snap={snap}
      showResolved={showResolved}
      setShowResolved={setShowResolved}
      onOpen={(c) => {
        setDraft(null)
        setOpenC(c.id)
        setPanel(null)
        const w = commentWorld(c)
        if (w) {
          const el = canvasRef.current!
          setView((v) => ({ ...v, x: el.clientWidth / 2 - w.x * v.z - (narrow ? 0 : 120), y: el.clientHeight / (narrow ? 3 : 2) - w.y * v.z }))
        }
      }}
    />
  )

  return (
    <div className={`editor ${narrow ? 'narrow' : 'wide'}`}>
      <header className="ed-bar">
        <div className="ed-bar-left">
          {readOnly ? <span className="wordmark small"><Logo size={20} /></span> : <button className="icon-btn" onClick={() => navigate('/')} aria-label={t('Proyectos')} title={t('Proyectos')}><Icon name="back" size={20} /></button>}
          <input
            className="ed-name"
            value={name}
            readOnly={readOnly}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !readOnly && name.trim() && api.rename(projectId, name.trim())}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label={t('Nombre del proyecto')}
          />
          {readOnly && <span className="ro-badge">{t('Solo lectura')}</span>}
          {store.gone ? <span className="conn off">{t('Proyecto eliminado')}</span> : store.status !== 'connected' ? <span className="conn off">{store.synced ? t('Reconectando…') : t('Conectando…')}</span> : null}
        </div>
        {!narrow && (
          <div className="ed-tools">
            <ToolButtons tool={tool} setTool={setTool} readOnly={readOnly} />
            {!readOnly && <span className="sep" />}
            {!readOnly && <button className="icon-btn" disabled={!store.undo.canUndo()} onClick={() => store.undo.undo()} title={t('Deshacer (⌘Z)')} aria-label={t('Deshacer')}><Icon name="undo" size={19} /></button>}
            {!readOnly && <button className="icon-btn" disabled={!store.undo.canRedo()} onClick={() => store.undo.redo()} title={t('Rehacer (⇧⌘Z)')} aria-label={t('Rehacer')}><Icon name="redo" size={19} /></button>}
            <span className="sep" />
            <button className={'icon-btn' + (showFlows ? ' on' : '')} onClick={() => setShowFlows(!showFlows)} title={t('Mostrar flujos')} aria-label={t('Mostrar flujos')}><Icon name="link" size={19} /></button>
          </div>
        )}
        <div className="ed-bar-right">
          <Peers store={store} onFollow={followPeer} onMe={() => setDialog('me')} />
          {!narrow && (
            <div className="zoom">
              <button className="icon-btn" onClick={() => zoomBy(0.8)} aria-label={t('Alejar')}><Icon name="minus" size={17} /></button>
              <button className="zoom-val" onClick={fitAll} title={t('Ajustar todo (⇧1)')}>{Math.round(z * 100)}%</button>
              <button className="icon-btn" onClick={() => zoomBy(1.25)} aria-label={t('Acercar')}><Icon name="plus" size={17} /></button>
            </div>
          )}
          {!narrow && <button className="icon-btn" onClick={exportPdf} title={t('Exportar PDF')} aria-label={t('Exportar PDF')}><Icon name="file" size={19} /></button>}
          {!narrow && !readOnly && <button className="btn ghost" onClick={() => setDialog('share')}><Icon name="share" size={17} />{t('Compartir')}</button>}
          <button className="btn primary" onClick={() => present()} title={t('Presentar (P)')} aria-label={t('Presentar')}><Icon name="play" size={16} />{narrow ? '' : t('Presentar')}</button>
        </div>
      </header>

      <div className="ed-body">
        {!narrow && !readOnly && (
          <aside className="ed-left">
            <Palette sketch={snap.style === 'sketch'} onPointerDown={onPaletteDown} onTemplate={addTemplate} />
          </aside>
        )}

        <div
          className={`canvas tool-${tool}${readOnly ? ' ro' : ''}`}
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onHover}
          onPointerLeave={() => store.setCursor(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${z})`, ['--z' as any]: z }}>
            {showFlows && <Flows snap={snap} store={store} selId={selEl?.id || null} z={z} />}
            {snap.screens.map((s) => {
              const o = screenOffset(s)
              const isSel = sel?.kind === 'screen' && sel.id === s.id
              return (
                <div key={s.id} className={'screen-wrap' + (isSel ? ' sel' : '') + (active === s.id ? ' active' : '')} style={{ left: o.x, top: o.y, width: s.w, height: s.h }}>
                  <div className="screen-title" data-screen-title={s.id} style={{ transform: `scale(${1 / z})`, maxWidth: s.w * z }}>
                    {snap.start === s.id && <Icon name="play" size={11} />}
                    <span>{s.name}</span>
                  </div>
                  <ScreenView
                    screen={s}
                    els={snap.byScreen.get(s.id) || []}
                    sketch={snap.style === 'sketch'}
                    hidden={drag?.kind === 'els' && drag.screenIds.has(s.id) ? drag.hidden : null}
                  />
                </div>
              )
            })}

            {drag?.kind === 'els' &&
              drag.vis.map((v) => (
                <div key={v.el.id} className="drag-ghost" style={{ left: v.wx, top: v.wy }}>
                  <ElPreview el={v.el} sketch={snap.style === 'sketch'} />
                </div>
              ))}
            {drag?.kind === 'els' && drag.guide !== null && (() => {
              const s = store.screens.get(drag.vis[0].el.screenId)
              return s ? <div className="guide" style={{ left: drag.guide, top: s.y, height: s.h }} /> : null
            })()}

            {/* selection */}
            {(drag?.kind === 'els'
              ? drag.vis.map((v) => ({ id: v.el.id, x: v.wx, y: v.wy, w: v.el.w, h: v.el.h }))
              : selIds
                  .map((id) => {
                    const el = store.els.get(id)
                    const s = el && store.screens.get(el.screenId)
                    if (!el || !s) return null
                    const o = screenOffset(s)
                    return { id, x: o.x + el.x, y: o.y + el.y, w: el.w, h: el.h }
                  })
                  .filter(Boolean)
            ).map((r) => (
              <div key={r!.id} className="sel-box" style={{ left: r!.x, top: r!.y, width: r!.w, height: r!.h }}>
                {selIds.length === 1 && tool === 'select' &&
                  ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((d) => (
                    <i key={d} data-handle={d} className={`h h-${d}`} style={{ width: handleSize, height: handleSize, margin: -handleSize / 2 }} />
                  ))}
                {selIds.length === 1 && !drag && (
                  <span className="sel-size" style={{ transform: `translateX(-50%) scale(${1 / z})` }}>{Math.round(r!.w)} × {Math.round(r!.h)}</span>
                )}
              </div>
            ))}

            <PeerSelections store={store} />
            <PeerDrags store={store} sketch={snap.style === 'sketch'} />
          </div>

          {/* comment pins */}
          {snap.comments.map((c) => {
            if (c.resolved && !showResolved && openC !== c.id) return null
            const w = commentWorld(c)
            if (!w) return null
            const p = toScreenPt(w)
            return (
              <button
                key={c.id}
                className={'pin' + (openC === c.id ? ' open' : '') + (c.resolved ? ' resolved' : '')}
                style={{ left: p.x, top: p.y }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setDraft(null)
                  setOpenC(openC === c.id ? null : c.id)
                }}
                aria-label={t('Comentario de {name}', { name: c.author })}
              >
                <span style={{ background: c.resolved ? undefined : c.color }}>{initials(c.author)}</span>
                {c.replies.length > 0 && <em>{c.replies.length + 1}</em>}
              </button>
            )
          })}
          {draft && (() => {
            const w = commentWorld(draft)
            if (!w) return null
            const p = toScreenPt(w)
            return <span className="pin draft" style={{ left: p.x, top: p.y }}><span>+</span></span>
          })()}

          <PeerCursors store={store} view={view} />

          {(openComment || draft) && (
            <CommentPopover
              key={openComment?.id || 'draft'}
              store={store}
              comment={openComment}
              draft={draft}
              style={popoverStyle(openComment ? commentWorld(openComment) : draft ? commentWorld(draft) : null)}
              onClose={() => {
                setOpenC(null)
                setDraft(null)
              }}
              onCreated={(id) => {
                setDraft(null)
                setOpenC(id)
              }}
            />
          )}

          {!store.synced && <div className="canvas-msg">{t('Cargando proyecto…')}</div>}
          {tool === 'comment' && <div className="canvas-hint">{t('Toca cualquier punto para dejar un comentario')}</div>}

          {narrow && !readOnly && selIds.length > 0 && !panel && (
            <div className="ctx-bar" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => setPanel('props')}><Icon name="edit" size={18} />{t('Editar')}</button>
              <button onClick={() => setPanel('props')}><Icon name="link" size={18} />{t('Enlazar')}</button>
              <button onClick={() => setSel({ kind: 'els', ids: store.duplicateEls(selIds) })}><Icon name="copy" size={18} />{t('Duplicar')}</button>
              <button className="danger" onClick={() => (store.deleteEls(selIds), setSel(null))}><Icon name="trash" size={18} />{t('Borrar')}</button>
            </div>
          )}
          {narrow && (
            <div className="float-zoom" onPointerDown={(e) => e.stopPropagation()}>
              <button className="icon-btn" onClick={fitAll} aria-label={t('Ajustar todo')}><Icon name="fit" size={18} /></button>
              <button className="icon-btn" onClick={() => active && fitScreen(active)} aria-label={t('Enfocar pantalla')}><Icon name="phone" size={18} /></button>
            </div>
          )}
        </div>

        {!narrow && (
          <aside className="ed-right">
            {!readOnly && (
              <div className="tabs">
                <button className={rightTab === 'props' ? 'on' : ''} onClick={() => setRightTab('props')}>{t('Propiedades')}</button>
                <button className={rightTab === 'comments' ? 'on' : ''} onClick={() => setRightTab('comments')}>
                  {t('Comentarios')}{openCount ? <span className="count">{openCount}</span> : null}
                </button>
              </div>
            )}
            <div className="ed-right-body">{rightTab === 'props' && !readOnly ? inspector : commentsPanel}</div>
          </aside>
        )}
      </div>

      {narrow && (
        <nav className="ed-bottom">
          <ToolButtons tool={tool} setTool={setTool} labels readOnly={readOnly} />
          {!readOnly && <button className={panel === 'add' ? 'on' : ''} onClick={() => setPanel(panel === 'add' ? null : 'add')}><Icon name="plus" size={22} /><small>{t('Añadir')}</small></button>}
          {!readOnly && <button className={panel === 'props' ? 'on' : ''} onClick={() => setPanel(panel === 'props' ? null : 'props')}><Icon name="settings" size={22} /><small>{t('Ajustes')}</small></button>}
          <button className={panel === 'comments' ? 'on' : ''} onClick={() => setPanel(panel === 'comments' ? null : 'comments')}>
            <Icon name="comment" size={22} />
            <small>{t('Hilos')}</small>
            {openCount ? <span className="count">{openCount}</span> : null}
          </button>
          {!readOnly && <button disabled={!store.undo.canUndo()} onClick={() => store.undo.undo()}><Icon name="undo" size={22} /><small>{t('Deshacer')}</small></button>}
          {readOnly && <button onClick={exportPdf}><Icon name="file" size={22} /><small>PDF</small></button>}
        </nav>
      )}
      {narrow && panel && (
        <>
          <div className="sheet-scrim" onClick={() => setPanel(null)} />
          <div className={`sheet sheet-${panel}`}>
            <div className="sheet-head">
              <b>{t(panel === 'add' ? 'Componentes' : panel === 'props' ? 'Ajustes' : 'Comentarios')}</b>
              <button className="icon-btn" onClick={() => setPanel(null)} aria-label={t('Cerrar')}><Icon name="close" size={20} /></button>
            </div>
            <div className="sheet-body">
              {panel === 'add' && <Palette sketch={snap.style === 'sketch'} onPointerDown={onPaletteDown} onTemplate={addTemplate} />}
              {panel === 'props' && (
                <>
                  {inspector}
                  <div className="sheet-extra">
                    <button className="btn ghost" onClick={() => (setPanel(null), setDialog('share'))}><Icon name="share" size={17} />{t('Compartir')}</button>
                    <button className="btn ghost" onClick={exportPdf}><Icon name="file" size={17} />{t('Exportar PDF')}</button>
                  </div>
                </>
              )}
              {panel === 'comments' && commentsPanel}
            </div>
          </div>
        </>
      )}

      {ghost && (
        <div className="palette-ghost" style={{ left: ghost.x, top: ghost.y }}>{t(DEFS[ghost.type]?.label || '')}</div>
      )}
      {toast && <div className="toast">{toast}</div>}
      {dialog === 'share' && <ShareDialog projectId={projectId} onClose={() => setDialog(null)} flash={flash} />}
      {dialog === 'me' && <MeDialog user={store.user} onClose={() => setDialog(null)} onSave={(u) => (onUserChange(u), setDialog(null))} />}
      {proto && (
        <Prototype
          snap={snap}
          startId={proto}
          onClose={(last) => {
            setProto(null)
            if (location.search) history.replaceState(null, '', location.pathname)
            setActive(last)
          }}
        />
      )}
    </div>
  )
}

function ToolButtons({ tool, setTool, labels, readOnly }: { tool: Tool; setTool: (t: Tool) => void; labels?: boolean; readOnly?: boolean }) {
  // on touch layouts one finger already pans and two fingers zoom, so the hand tool is desktop-only
  const tools = ([
    ['select', 'pointer', 'Seleccionar', 'V'],
    ['hand', 'hand', 'Mover', 'H'],
    ['comment', 'comment', 'Comentar', 'C'],
  ] as [Tool, string, string, string][]).filter(([id]) => (!labels || id !== 'hand') && (!readOnly || id !== 'hand'))
  return (
    <>
      {tools.map(([id, icon, label, key]) => (
        <button key={id} className={(labels ? '' : 'icon-btn ') + (tool === id ? 'on' : '')} onClick={() => setTool(id)} title={`${t(label)} (${key})`} aria-label={t(label)}>
          <Icon name={icon} size={labels ? 22 : 19} />
          {labels && <small>{t(label)}</small>}
        </button>
      ))}
    </>
  )
}

function Flows({ snap, store, selId, z }: { snap: Snapshot; store: Store; selId: string | null; z: number }) {
  const paths: { id: string; d: string; on: boolean; end: Pt; start: Pt; dir: number }[] = []
  for (const e of snap.els) {
    if (!e.link) continue
    const from = store.screens.get(e.screenId)
    const to = store.screens.get(e.link)
    if (!from || !to) continue
    const cy = from.y + e.y + e.h / 2
    const right = to.x >= from.x + from.w / 2
    const sx = right ? from.x + e.x + e.w : from.x + e.x
    const tx = right ? to.x : to.x + to.w
    const ty = Math.min(Math.max(cy, to.y + 40), to.y + to.h - 40)
    const k = Math.max(60, Math.abs(tx - sx) / 2)
    const dir = right ? 1 : -1
    paths.push({
      id: e.id,
      d: `M${sx} ${cy} C${sx + k * dir} ${cy} ${tx - k * dir} ${ty} ${tx - 6 * dir} ${ty}`,
      on: e.id === selId,
      end: { x: tx, y: ty },
      start: { x: sx, y: cy },
      dir,
    })
  }
  if (!paths.length) return null
  const sw = 2 / z
  const a = 8 / z
  return (
    <svg className="flows" width="1" height="1">
      {paths.map((p) => (
        <g key={p.id} className={p.on ? 'on' : ''}>
          <path d={p.d} strokeWidth={p.on ? sw * 1.5 : sw} fill="none" />
          <circle cx={p.start.x} cy={p.start.y} r={3.5 / z} />
          <path d={`M${p.end.x - a * p.dir} ${p.end.y - a * 0.7} L${p.end.x} ${p.end.y} L${p.end.x - a * p.dir} ${p.end.y + a * 0.7}`} strokeWidth={sw} fill="none" />
        </g>
      ))}
    </svg>
  )
}

function Peers({ store, onFollow, onMe }: { store: Store; onFollow: (p: Peer) => void; onMe: () => void }) {
  const peers = usePeers(store)
  const uniq = Array.from(new Map(peers.map((p) => [p.user.name, p])).values())
  return (
    <div className="peers">
      {uniq.slice(0, 4).map((p) => (
        <button key={p.clientId} className="avatar" style={{ background: p.user.color }} title={t('Ir a donde está {name}', { name: p.user.name })} onClick={() => onFollow(p)}>
          {initials(p.user.name)}
        </button>
      ))}
      {uniq.length > 4 && <span className="avatar more">+{uniq.length - 4}</span>}
      <button className="avatar me" style={{ background: store.user.color }} title={`${store.user.name} ${t('(tú)')}`} onClick={onMe}>{initials(store.user.name)}</button>
    </div>
  )
}

function ShareDialog({ projectId, onClose, flash }: { projectId: string; onClose: () => void; flash: (m: string) => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const team = `${location.origin}/p/${projectId}`
  const view = token ? `${location.origin}/v/${token}` : ''
  const make = async (reset = false) => {
    setBusy(true)
    try {
      setToken((await api.share(projectId, reset)).token)
      if (reset) flash(t('Enlace anterior desactivado'))
    } finally {
      setBusy(false)
    }
  }
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      flash(t('Enlace copiado'))
    } catch {}
  }
  return (
    <div className="modal-scrim" onPointerDown={onClose}>
      <div className="modal" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={t('Compartir')}>
        <div className="modal-head"><b>{t('Compartir')}</b><button className="icon-btn" onClick={onClose} aria-label={t('Cerrar')}><Icon name="close" size={18} /></button></div>
        <div className="share-opt">
          <div><b>{t('Equipo: puede editar')}</b><p>{t('Necesita el código del equipo.')}</p></div>
          <div className="share-url"><input readOnly value={team} onFocus={(e) => e.target.select()} /><button className="btn ghost sm" onClick={() => copy(team)}>{t('Copiar')}</button></div>
        </div>
        <div className="share-opt">
          <div><b>{t('Invitados: ver y comentar')}</b><p>{t('Sin código. Pueden navegar el prototipo y dejar comentarios, pero no modificar nada.')}</p></div>
          {token ? (
            <>
              <div className="share-url"><input readOnly value={view} onFocus={(e) => e.target.select()} /><button className="btn primary sm" onClick={() => copy(view)}>{t('Copiar')}</button></div>
              <button className="linkish" disabled={busy} onClick={() => make(true)}>{t('Desactivar y crear un enlace nuevo')}</button>
            </>
          ) : (
            <button className="btn primary" disabled={busy} onClick={() => make(false)}><Icon name="link" size={16} />{t('Crear enlace de solo lectura')}</button>
          )}
        </div>
      </div>
    </div>
  )
}

function MeDialog({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [name, setName] = useState(user.name)
  const [color, setColor] = useState(user.color)
  return (
    <div className="modal-scrim" onPointerDown={onClose}>
      <div className="modal small" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={t('Tu perfil')}>
        <div className="modal-head"><b>{t('Tu perfil')}</b><button className="icon-btn" onClick={onClose} aria-label={t('Cerrar')}><Icon name="close" size={18} /></button></div>
        <label className="f"><span>{t('Tu nombre')}</span><input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
        <div className="f">
          <span>{t('Tu color')}</span>
          <div className="swatch-row">
            {COLORS.map((c) => <button key={c} type="button" className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />)}
          </div>
        </div>
        <button className="btn primary" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), color })}>{t('Guardar')}</button>
      </div>
    </div>
  )
}

function PeerCursors({ store, view }: { store: Store; view: View }) {
  const peers = usePeers(store)
  return (
    <>
      {peers.map((p) =>
        p.cursor ? (
          <div key={p.clientId} className="peer-cursor" style={{ left: p.cursor.x * view.z + view.x, top: p.cursor.y * view.z + view.y, color: p.user.color }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 2l13 5.5-5.5 1.8L7.5 15z" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            <span style={{ background: p.user.color }}>{p.user.name}</span>
          </div>
        ) : null,
      )}
    </>
  )
}

function PeerDrags({ store, sketch }: { store: Store; sketch: boolean }) {
  const peers = usePeers(store)
  return (
    <>
      {peers.map((p) => {
        const d = p.drag
        if (!d) return null
        if (d.screen) {
          const s = store.screens.get(d.screen.id)
          if (!s) return null
          return <div key={p.clientId} className="peer-sel" style={{ left: s.x + d.screen.dx, top: s.y + d.screen.dy, width: s.w, height: s.h, borderColor: p.user.color }} />
        }
        return (d.els || []).map((g) => {
          const el = store.els.get(g.id)
          if (!el) return null
          return (
            <div key={`${p.clientId}-${g.id}`} className="drag-ghost peer" style={{ left: g.wx, top: g.wy, outlineColor: p.user.color }}>
              <ElPreview el={{ ...el, w: g.w, h: g.h }} sketch={sketch} />
            </div>
          )
        })
      })}
    </>
  )
}

function PeerSelections({ store }: { store: Store }) {
  const peers = usePeers(store)
  return (
    <>
      {peers.map((p) => {
        if (!p.sel) return null
        const el = store.els.get(p.sel)
        const s = el && store.screens.get(el.screenId)
        if (!el || !s) return null
        return <div key={p.clientId} className="peer-sel" style={{ left: s.x + el.x, top: s.y + el.y, width: el.w, height: el.h, borderColor: p.user.color }} />
      })}
    </>
  )
}
