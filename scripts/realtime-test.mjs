// Prueba de tiempo real: levanta una instancia aislada del servidor (puerto 3999, datos en /tmp, código de prueba)
// y simula varios clientes Yjs. Uso: npm run test:realtime
import { spawn } from 'node:child_process'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import WebSocket from 'ws'

const PORT = 3999
const BASE = `http://127.0.0.1:${PORT}`
const env = { ...process.env, PORT: String(PORT), TEAM_CODE: 'rt-test-code', DATA_DIR: '/tmp/rtdata', SECRET: 'rt-secret' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

let srv
async function startServer() {
  srv = spawn('node', ['--disable-warning=ExperimentalWarning', new URL('../server/index.mjs', import.meta.url).pathname], { env, stdio: ['ignore', 'ignore', 'inherit'] })
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/healthz`)).ok) return
    } catch {}
    await sleep(100)
  }
  throw new Error('server did not start')
}
async function stopServer() {
  srv.kill('SIGTERM')
  await new Promise((r) => srv.once('exit', r))
}

function client(project, { cookie, share } = {}) {
  const doc = new Y.Doc()
  class WS extends WebSocket {
    constructor(url) {
      super(url, { headers: cookie ? { cookie } : {} })
    }
  }
  const provider = new WebsocketProvider(`ws://127.0.0.1:${PORT}/ws`, project, doc, { WebSocketPolyfill: WS, params: share ? { share } : {}, disableBc: true })
  const closes = []
  provider.on('connection-close', (ev) => closes.push(ev?.code))
  const synced = new Promise((res) => provider.on('sync', (s) => s && res()))
  return { doc, provider, synced, closes, screens: doc.getMap('screens'), els: doc.getMap('els'), comments: doc.getMap('comments') }
}

const waitFor = async (fn, timeout = 3000) => {
  const t0 = performance.now()
  while (performance.now() - t0 < timeout) {
    if (fn()) return performance.now() - t0
    await sleep(2)
  }
  return null
}

await startServer()
const login = await fetch(`${BASE}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'rt-test-code' }) })
const cookie = login.headers.get('set-cookie').split(';')[0]
const proj = await (await fetch(`${BASE}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ name: 'RT' }) })).json()

const A = client(proj.id, { cookie })
const B = client(proj.id, { cookie })
const C = client(proj.id, { cookie })
await Promise.all([A.synced, B.synced, C.synced])
ok('3 miembros conectados y sincronizados', true)

// 1. latency A -> B,C
const lat = []
for (let i = 0; i < 30; i++) {
  const id = `s${i}`
  A.doc.transact(() => A.screens.set(id, { id, name: `S${i}`, x: i * 500, y: 0, w: 390, h: 844, device: 'iphone' }))
  const d = await waitFor(() => B.screens.has(id) && C.screens.has(id))
  lat.push(d ?? 9999)
}
lat.sort((a, b) => a - b)
ok('Cambios llegan a todos', lat[lat.length - 1] < 3000, `mediana ${lat[15].toFixed(1)} ms, máx ${lat[29].toFixed(1)} ms (sin contar la red)`)

// 2. concurrent edits converge
for (let i = 0; i < 60; i++) {
  A.els.set(`a${i}`, { id: `a${i}`, x: i })
  B.els.set(`b${i}`, { id: `b${i}`, x: i })
  C.els.set(`same`, { id: 'same', by: 'C', i })
  B.els.set(`same`, { id: 'same', by: 'B', i })
}
await waitFor(() => A.els.size === 121 && B.els.size === 121 && C.els.size === 121, 5000)
const norm = (m) => JSON.stringify(Object.entries(m.toJSON()).sort(([a], [b]) => (a < b ? -1 : 1)))
const same = (x, y) => norm(x.els) === norm(y.els)
ok('Ediciones simultáneas convergen al mismo estado', same(A, B) && same(B, C) && A.els.size === 121, `${A.els.size} elementos en los 3 clientes`)

// 3. awareness (cursors)
A.provider.awareness.setLocalStateField('user', { name: 'Ana', color: '#3b6cf6' })
A.provider.awareness.setLocalStateField('cursor', { x: 123, y: 456 })
const cur = await waitFor(() => {
  const st = B.provider.awareness.getStates().get(A.doc.clientID)
  return st?.cursor?.x === 123
})
ok('Cursor de un compañero visible', cur !== null, cur !== null ? `${cur.toFixed(1)} ms` : 'no llegó')
A.provider.awareness.setLocalStateField('drag', { els: [{ id: 'a1', wx: 10, wy: 20, w: 100, h: 40 }] })
const dr = await waitFor(() => B.provider.awareness.getStates().get(A.doc.clientID)?.drag?.els?.[0]?.wx === 10)
ok('Arrastre en vivo visible para los demás', dr !== null, dr !== null ? `${dr.toFixed(1)} ms` : 'no llegó')

// 4. viewer via share link
const share = (await (await fetch(`${BASE}/api/projects/${proj.id}/share`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: '{}' })).json()).token
const info = await fetch(`${BASE}/api/share/${share}`)
ok('Enlace de solo lectura responde sin código', info.ok)
const V = client(proj.id, { share })
await V.synced
ok('Invitado ve el proyecto', V.screens.size === 30, `${V.screens.size} pantallas`)
V.comments.set('c1', { id: 'c1', text: 'hola', author: 'Invitado' })
const cm = await waitFor(() => A.comments.has('c1'))
ok('Invitado SÍ puede comentar', cm !== null, cm !== null ? `${cm.toFixed(1)} ms` : 'no llegó')
const V2 = client(proj.id, { share })
await V2.synced
V2.els.set('hack', { id: 'hack' })
V2.screens.delete('s0')
await waitFor(() => V2.closes.includes(4400), 2000)
await sleep(300)
ok('Invitado NO puede modificar pantallas ni elementos', !A.els.has('hack') && A.screens.has('s0') && B.screens.has('s0'))
ok('Un invitado que intenta editar queda desconectado', V2.closes.includes(4400))
V2.provider.destroy()
V.comments.set('c2', { id: 'c2', text: 'otro', author: 'Invitado' })
ok('El invitado legítimo sigue comentando', (await waitFor(() => A.comments.has('c2'))) !== null)
const badTok = client(proj.id, { share: 'token-falso' })
await sleep(800)
ok('Token falso rechazado', !badTok.provider.wsconnected)
badTok.provider.destroy()

// 5. revoke
await fetch(`${BASE}/api/projects/${proj.id}/share`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ reset: true }) })
await waitFor(() => V.closes.includes(4403), 2000)
ok('Al regenerar el enlace, el invitado anterior queda fuera', V.closes.includes(4403))
V.provider.destroy()

// 6. no cookie, no share
const N = client(proj.id, {})
await sleep(800)
ok('Sin sesión ni enlace: conexión rechazada', !N.provider.wsconnected)
N.provider.destroy()

// 7. reconnect after server restart + persistence
const before = norm(A.els)
await sleep(1800) // let the debounced save run
await stopServer()
await startServer()
const back = await waitFor(() => A.provider.wsconnected && B.provider.wsconnected, 8000)
ok('Clientes se reconectan solos tras reiniciar el servidor', back !== null, back !== null ? `${(back / 1000).toFixed(1)} s` : 'no volvieron')
A.els.set('after', { id: 'after' })
const ar = await waitFor(() => B.els.has('after'))
ok('Tras reconectar, el tiempo real sigue funcionando', ar !== null)
const D = client(proj.id, { cookie })
await D.synced
D.els.delete('after')
ok('Los datos persisten en disco tras reiniciar', norm(D.els) === before && D.comments.size === 2)

for (const c of [A, B, C, D]) c.provider.destroy()
await stopServer()
const failed = results.filter((r) => !r.pass).length
console.log(`\n${results.length - failed}/${results.length} pruebas superadas`)
process.exit(failed ? 1 : 0)
