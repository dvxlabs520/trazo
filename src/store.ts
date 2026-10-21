import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useSyncExternalStore } from 'react'
import { DEFS, localProps, sizeFor } from './library'
import { t } from './i18n'
import { DEVICES, uid, type Comment, type El, type Screen, type User } from './types'

export const LOCAL = { local: true }

export type Snapshot = {
  screens: Screen[]
  els: El[]
  byScreen: Map<string, El[]>
  comments: Comment[]
  style: 'clean' | 'sketch'
  start: string | null
}

export type PeerDrag = { els?: { id: string; wx: number; wy: number; w: number; h: number }[]; screen?: { id: string; dx: number; dy: number } } | null
export type Peer = { clientId: number; user: User; cursor?: { x: number; y: number } | null; sel?: string | null; drag?: PeerDrag }

const OVERLAY = new Set(['dialog', 'scrim', 'drawer', 'sheet', 'toast', 'fab', 'note', 'hotspot', 'keyboard'])

export class Store {
  doc = new Y.Doc()
  screens = this.doc.getMap<Screen>('screens')
  els = this.doc.getMap<El>('els')
  comments = this.doc.getMap<Comment>('comments')
  meta = this.doc.getMap<any>('meta')
  provider: WebsocketProvider
  undo: Y.UndoManager
  status: string = 'connecting'
  synced = false
  gone = false

  private version = 0
  private snap: Snapshot | null = null
  private listeners = new Set<() => void>()
  private presenceVersion = 0
  private presenceListeners = new Set<() => void>()
  private peersCache: Peer[] = []

  constructor(public projectId: string, public user: User, public share: string | null = null) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.provider = new WebsocketProvider(`${proto}//${location.host}/ws`, projectId, this.doc, { maxBackoffTime: 4000, params: share ? { share } : {} })
    this.provider.awareness.setLocalStateField('user', user)
    this.provider.on('status', ({ status }: { status: string }) => {
      this.status = status
      this.bump()
    })
    this.provider.on('sync', (s: boolean) => {
      this.synced = s
      try {
        if (s) sessionStorage.removeItem('trazo.reloaded')
      } catch {}
      this.bump()
    })
    this.provider.on('connection-close', (ev: CloseEvent | null) => {
      if (ev?.code === 4400) {
        // the server refused a read-only edit; start again from the server state (once)
        this.provider.shouldConnect = false
        try {
          if (!sessionStorage.getItem('trazo.reloaded')) {
            sessionStorage.setItem('trazo.reloaded', '1')
            location.reload()
          }
        } catch {}
        return
      }
      if (ev?.code === 4404 || ev?.code === 4403) {
        this.gone = true
        this.provider.shouldConnect = false
        this.bump()
      }
    })
    this.doc.on('update', () => this.bump())
    this.provider.awareness.on('change', () => {
      this.presenceVersion++
      this.peersCache = this.computePeers()
      this.presenceListeners.forEach((l) => l())
    })
    this.undo = new Y.UndoManager([this.screens, this.els, this.meta], { trackedOrigins: new Set([LOCAL]), captureTimeout: 300 })
    this.undo.on('stack-item-added', () => this.bump())
    this.undo.on('stack-item-popped', () => this.bump())
  }

  destroy() {
    this.provider.destroy()
    this.doc.destroy()
  }

  // ---------- subscriptions ----------
  private bump() {
    this.version++
    this.snap = null
    this.listeners.forEach((l) => l())
  }
  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getVersion = () => this.version
  subscribePresence = (l: () => void) => {
    this.presenceListeners.add(l)
    return () => this.presenceListeners.delete(l)
  }
  getPresenceVersion = () => this.presenceVersion

  snapshot(): Snapshot {
    if (this.snap) return this.snap
    const screens = Array.from(this.screens.values()).sort((a, b) => a.x - b.x || a.y - b.y)
    const els = Array.from(this.els.values()).sort((a, b) => a.z - b.z)
    const byScreen = new Map<string, El[]>()
    for (const s of screens) byScreen.set(s.id, [])
    for (const e of els) byScreen.get(e.screenId)?.push(e)
    const comments = Array.from(this.comments.values()).sort((a, b) => a.ts - b.ts)
    this.snap = {
      screens,
      els,
      byScreen,
      comments,
      style: this.meta.get('style') === 'sketch' ? 'sketch' : 'clean',
      start: this.meta.get('start') ?? null,
    }
    return this.snap
  }

  private computePeers(): Peer[] {
    const out: Peer[] = []
    this.provider.awareness.getStates().forEach((state, clientId) => {
      if (clientId === this.doc.clientID || !state.user) return
      out.push({ clientId, user: state.user, cursor: state.cursor, sel: state.sel, drag: state.drag })
    })
    return out
  }
  peers() {
    return this.peersCache
  }
  setUser(user: User) {
    this.user = user
    this.provider.awareness.setLocalStateField('user', user)
  }
  setCursor(cursor: { x: number; y: number } | null) {
    this.provider.awareness.setLocalStateField('cursor', cursor)
  }
  setDragPresence(drag: PeerDrag) {
    this.provider.awareness.setLocalStateField('drag', drag)
  }
  setSel(sel: string | null) {
    this.provider.awareness.setLocalStateField('sel', sel)
  }

  // ---------- transactions ----------
  tx(fn: () => void) {
    this.doc.transact(fn, LOCAL)
  }

  // ---------- screens ----------
  addScreen(device = 'iphone', name?: string): string {
    const d = DEVICES[device] || DEVICES.iphone
    const all = Array.from(this.screens.values())
    const right = all.reduce((m, s) => Math.max(m, s.x + s.w), -120)
    const id = uid()
    this.tx(() => {
      this.screens.set(id, { id, name: name || t('Pantalla {n}', { n: all.length + 1 }), x: right + 120, y: 0, w: d.w, h: d.h, device, bg: 'white' })
      if (!this.meta.get('start')) this.meta.set('start', id)
    })
    return id
  }
  updateScreen(id: string, patch: Partial<Screen>) {
    const s = this.screens.get(id)
    if (!s) return
    this.tx(() => {
      const next = { ...s, ...patch }
      if (patch.device && DEVICES[patch.device]) {
        const d = DEVICES[patch.device]
        const scaleFull = (e: El) => {
          const def = DEFS[e.type]
          if (!def) return e
          const p: Partial<El> = {}
          if (def.w === 'full' && e.w === s.w) p.w = d.w
          if (def.w === 'fill' && e.w === s.w - 32) p.w = d.w - 32
          if (def.h === 'full' && e.h === s.h) p.h = d.h
          if (def.dock === 'bottom') p.y = e.y + (d.h - s.h)
          return { ...e, ...p }
        }
        next.w = d.w
        next.h = d.h
        this.els.forEach((e) => {
          if (e.screenId === id) this.els.set(e.id, scaleFull(e))
        })
      }
      this.screens.set(id, next)
    })
  }
  deleteScreen(id: string) {
    this.tx(() => {
      this.screens.delete(id)
      this.els.forEach((e) => {
        if (e.screenId === id) this.els.delete(e.id)
        else if (e.link === id) this.els.set(e.id, { ...e, link: null })
      })
      if (this.meta.get('start') === id) this.meta.set('start', this.screens.keys().next().value ?? null)
    })
    this.doc.transact(() => {
      this.comments.forEach((c) => {
        if (c.screenId === id) this.comments.delete(c.id)
      })
    })
  }
  duplicateScreen(id: string): string | null {
    const s = this.screens.get(id)
    if (!s) return null
    const nid = uid()
    this.tx(() => {
      // shift screens to the right of the original to make room
      this.screens.forEach((o) => {
        if (o.x > s.x && Math.abs(o.y - s.y) < s.h) this.screens.set(o.id, { ...o, x: o.x + s.w + 120 })
      })
      this.screens.set(nid, { ...s, id: nid, name: t('{name} copia', { name: s.name }), x: s.x + s.w + 120 })
      this.els.forEach((e) => {
        if (e.screenId === id) {
          const eid = uid()
          this.els.set(eid, { ...e, id: eid, screenId: nid, props: { ...e.props } })
        }
      })
    })
    return nid
  }

  // ---------- elements ----------
  private maxZ() {
    let z = 0
    this.els.forEach((e) => (z = Math.max(z, e.z)))
    return z
  }

  placement(screenId: string, type: string) {
    const def = DEFS[type]
    const s = this.screens.get(screenId)!
    const { w, h } = sizeFor(def, s.w, s.h)
    const sib = Array.from(this.els.values()).filter((e) => e.screenId === screenId)
    const dockOf = (e: El) => DEFS[e.type]?.dock
    const bottomTop = sib.filter((e) => dockOf(e) === 'bottom').reduce((m, e) => Math.min(m, e.y), s.h)
    let x = def.w === 'full' ? 0 : def.w === 'fill' ? 16 : Math.round((s.w - w) / 2)
    let y: number
    if (def.dock === 'top') {
      y = sib.filter((e) => dockOf(e) === 'top').reduce((m, e) => Math.max(m, e.y + e.h), 0)
    } else if (def.dock === 'bottom') {
      y = bottomTop - h
    } else if (def.h === 'full') {
      y = 0
      if (type === 'drawer') x = 0
    } else if (type === 'dialog' || type === 'spinner') {
      y = Math.round((s.h - h) / 2)
    } else if (type === 'fab') {
      x = s.w - w - 16
      y = bottomTop - h - 16
    } else if (type === 'toast') {
      y = bottomTop - h - 16
    } else {
      const flow = sib.filter((e) => !dockOf(e) && !OVERLAY.has(e.type) && DEFS[e.type]?.h !== 'full')
      const tops = sib.filter((e) => dockOf(e) === 'top').reduce((m, e) => Math.max(m, e.y + e.h), 0)
      const bottom = flow.reduce((m, e) => Math.max(m, e.y + e.h), tops)
      y = bottom + 16
      if (y + h > bottomTop && bottom < bottomTop) y = Math.max(tops, bottomTop - h - 8)
    }
    return { x, y, w, h }
  }

  addTemplate(name: string, items: [string, number, number, number, number, Record<string, any>?][]): string {
    const id = this.addScreen('iphone', name)
    this.tx(() => {
      let z = this.maxZ()
      for (const [type, x, y, w, h, props] of items) {
        const def = DEFS[type]
        if (!def) continue
        const eid = uid()
        this.els.set(eid, { id: eid, screenId: id, type, x, y, w, h, z: ++z, props: { ...localProps(def.props), ...localProps(props || {}) }, link: null })
      }
    })
    return id
  }

  addEl(screenId: string, type: string, at?: { x: number; y: number }): string | null {
    const def = DEFS[type]
    if (!def || !this.screens.get(screenId)) return null
    const place = this.placement(screenId, type)
    if (at) {
      place.x = Math.round(at.x - place.w / 2)
      place.y = Math.round(at.y - place.h / 2)
      if (def.w === 'full') place.x = 0
      if (def.w === 'fill') place.x = 16
    }
    const id = uid()
    this.tx(() => {
      this.els.set(id, { id, screenId, type, ...place, z: this.maxZ() + 1, props: localProps(def.props), link: null })
    })
    return id
  }
  updateEl(id: string, patch: Partial<El>) {
    const e = this.els.get(id)
    if (!e) return
    this.tx(() => this.els.set(id, { ...e, ...patch }))
  }
  updateEls(patches: Record<string, Partial<El>>) {
    this.tx(() => {
      for (const [id, patch] of Object.entries(patches)) {
        const e = this.els.get(id)
        if (e) this.els.set(id, { ...e, ...patch })
      }
    })
  }
  setProp(id: string, key: string, value: any) {
    const e = this.els.get(id)
    if (!e) return
    this.tx(() => this.els.set(id, { ...e, props: { ...e.props, [key]: value } }))
  }
  deleteEls(ids: string[]) {
    this.tx(() => ids.forEach((id) => this.els.delete(id)))
  }
  duplicateEls(ids: string[], offset = 16): string[] {
    const out: string[] = []
    this.tx(() => {
      let z = this.maxZ()
      for (const id of ids) {
        const e = this.els.get(id)
        if (!e) continue
        const nid = uid()
        this.els.set(nid, { ...e, id: nid, x: e.x + offset, y: e.y + offset, z: ++z, props: { ...e.props } })
        out.push(nid)
      }
    })
    return out
  }
  pasteEls(copies: El[], screenId: string): string[] {
    const out: string[] = []
    const s = this.screens.get(screenId)
    if (!s) return out
    this.tx(() => {
      let z = this.maxZ()
      for (const e of copies) {
        const nid = uid()
        const same = e.screenId === screenId
        this.els.set(nid, { ...e, id: nid, screenId, x: same ? e.x + 16 : e.x, y: same ? e.y + 16 : e.y, z: ++z, props: { ...e.props } })
        out.push(nid)
      }
    })
    return out
  }
  bringToFront(id: string) {
    this.updateEl(id, { z: this.maxZ() + 1 })
  }
  sendToBack(id: string) {
    let z = Infinity
    this.els.forEach((e) => (z = Math.min(z, e.z)))
    this.updateEl(id, { z: z - 1 })
  }

  // ---------- meta ----------
  setStyle(style: 'clean' | 'sketch') {
    this.tx(() => this.meta.set('style', style))
  }
  setStart(id: string) {
    this.tx(() => this.meta.set('start', id))
  }

  // ---------- comments (not part of undo) ----------
  addComment(c: Omit<Comment, 'id' | 'ts' | 'resolved' | 'replies' | 'author' | 'color'>): string {
    const id = uid()
    this.comments.set(id, { ...c, id, ts: Date.now(), resolved: false, replies: [], author: this.user.name, color: this.user.color })
    return id
  }
  replyComment(id: string, text: string) {
    const c = this.comments.get(id)
    if (!c) return
    this.comments.set(id, { ...c, replies: [...c.replies, { id: uid(), text, ts: Date.now(), author: this.user.name, color: this.user.color }] })
  }
  resolveComment(id: string, resolved: boolean) {
    const c = this.comments.get(id)
    if (c) this.comments.set(id, { ...c, resolved })
  }
  moveComment(id: string, patch: Partial<Comment>) {
    const c = this.comments.get(id)
    if (c) this.comments.set(id, { ...c, ...patch })
  }
  deleteComment(id: string) {
    this.comments.delete(id)
  }
}

export function useSnapshot(store: Store) {
  useSyncExternalStore(store.subscribe, store.getVersion)
  return store.snapshot()
}

export function usePeers(store: Store) {
  useSyncExternalStore(store.subscribePresence, store.getPresenceVersion)
  return store.peers()
}
