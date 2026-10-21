// Trazo server: static app, small JSON API and a Yjs sync/awareness WebSocket per project.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(ROOT, '../dist')
const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = process.env.DATA_DIR || path.resolve(ROOT, '../data')
const TEAM_CODE = process.env.TEAM_CODE || 'trazo'
const SECRET = process.env.SECRET || crypto.randomBytes(32).toString('hex')
const COOKIE = 'trazo_session'
const SESSION_DAYS = 180

fs.mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'trazo.db'))
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    screens INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    state BLOB
  );
`)
if (!db.prepare("SELECT 1 FROM pragma_table_info('projects') WHERE name = 'share_token'").get()) {
  db.exec('ALTER TABLE projects ADD COLUMN share_token TEXT')
}

const q = {
  list: db.prepare('SELECT id, name, created_at AS createdAt, updated_at AS updatedAt, screens, comments FROM projects ORDER BY updated_at DESC'),
  get: db.prepare('SELECT id, name, created_at AS createdAt, updated_at AS updatedAt, screens, comments FROM projects WHERE id = ?'),
  state: db.prepare('SELECT state FROM projects WHERE id = ?'),
  insert: db.prepare('INSERT INTO projects (id, name, created_at, updated_at, state) VALUES (?, ?, ?, ?, ?)'),
  rename: db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?'),
  save: db.prepare('UPDATE projects SET state = ?, updated_at = ?, screens = ?, comments = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM projects WHERE id = ?'),
  shareGet: db.prepare('SELECT share_token AS token FROM projects WHERE id = ?'),
  shareSet: db.prepare('UPDATE projects SET share_token = ? WHERE id = ?'),
  byShare: db.prepare('SELECT id, name FROM projects WHERE share_token = ?'),
}

// ---------- auth ----------
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url')
function makeToken() {
  const exp = String(Date.now() + SESSION_DAYS * 864e5)
  return `${exp}.${sign(exp)}`
}
function validToken(token) {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig) return false
  const good = sign(exp)
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return false
  return Number(exp) > Date.now()
}
function cookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}
const authed = (req) => validToken(cookies(req)[COOKIE])
const clientIp = (req) => req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress
const isHttps = (req) => (req.headers['x-forwarded-proto'] || '').includes('https')

const attempts = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const a = attempts.get(ip)
  if (!a || a.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 60_000 })
    return false
  }
  a.count++
  return a.count > 8
}

// ---------- http helpers ----------
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  res.end(data)
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 64 * 1024) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}
const cleanName = (n) => String(n || '').trim().slice(0, 80) || 'Sin título'
const newId = () => crypto.randomBytes(6).toString('base64url')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}
function serveStatic(req, res, pathname) {
  let file = path.join(DIST, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  if (!fs.existsSync(file)) return send(res, 404, { error: 'build missing' })
  const ext = path.extname(file)
  const immutable = pathname.startsWith('/assets/')
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
}

// ---------- API ----------
async function api(req, res, pathname) {
  if (pathname === '/api/login' && req.method === 'POST') {
    if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Demasiados intentos, espera un minuto.' })
    const body = await readJson(req)
    const code = String(body.code || '')
    const ok = code.length === TEAM_CODE.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(TEAM_CODE))
    if (!ok) return send(res, 401, { error: 'Código incorrecto.' })
    const cookie = `${COOKIE}=${makeToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${isHttps(req) ? '; Secure' : ''}`
    return send(res, 200, { ok: true }, { 'set-cookie': cookie })
  }
  if (pathname === '/api/logout' && req.method === 'POST') {
    return send(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` })
  }
  const sm = pathname.match(/^\/api\/share\/([\w-]+)$/)
  if (sm && req.method === 'GET') {
    const row = q.byShare.get(sm[1])
    return row ? send(res, 200, row) : send(res, 404, { error: 'not found' })
  }
  if (!authed(req)) return send(res, 401, { error: 'unauthorized' })
  if (pathname === '/api/me') return send(res, 200, { ok: true })

  if (pathname === '/api/projects') {
    if (req.method === 'GET') return send(res, 200, q.list.all())
    if (req.method === 'POST') {
      const body = await readJson(req)
      const id = newId()
      const now = Date.now()
      let state = null
      if (body.from) {
        const src = q.state.get(String(body.from))
        state = src?.state ?? null
      }
      q.insert.run(id, cleanName(body.name), now, now, state)
      return send(res, 201, q.get.get(id))
    }
  }
  const shm = pathname.match(/^\/api\/projects\/([\w-]+)\/share$/)
  if (shm && req.method === 'POST') {
    const id = shm[1]
    if (!q.get.get(id)) return send(res, 404, { error: 'not found' })
    const body = await readJson(req)
    let token = q.shareGet.get(id)?.token
    if (!token || body.reset) {
      token = crypto.randomBytes(16).toString('base64url')
      q.shareSet.run(token, id)
      // a new link revokes the old one: drop viewers still connected with it
      const room = rooms.get(id)
      if (room) for (const [conn, info] of room.roles) if (info.viewer && info.token !== token) conn.close(4403, 'revoked')
    }
    return send(res, 200, { token })
  }
  const m = pathname.match(/^\/api\/projects\/([\w-]+)$/)
  if (m) {
    const id = m[1]
    const row = q.get.get(id)
    if (!row) return send(res, 404, { error: 'not found' })
    if (req.method === 'GET') return send(res, 200, row)
    if (req.method === 'PATCH') {
      const body = await readJson(req)
      q.rename.run(cleanName(body.name), Date.now(), id)
      return send(res, 200, q.get.get(id))
    }
    if (req.method === 'DELETE') {
      const room = rooms.get(id)
      if (room) {
        room.deleted = true
        for (const conn of room.conns.keys()) conn.close(4404, 'deleted')
      }
      q.remove.run(id)
      return send(res, 200, { ok: true })
    }
  }
  return send(res, 404, { error: 'not found' })
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x')
  try {
    if (pathname === '/healthz') return send(res, 200, { ok: true })
    if (pathname.startsWith('/api/')) return await api(req, res, pathname)
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method' })
    return serveStatic(req, res, pathname)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) send(res, 500, { error: 'server error' })
  }
})

// ---------- Yjs rooms ----------
const MSG_SYNC = 0
const MSG_AWARENESS = 1
const rooms = new Map()

function countComments(doc) {
  let n = 0
  doc.getMap('comments').forEach((c) => {
    if (c && !c.resolved) n++
  })
  return n
}
function saveRoom(room) {
  clearTimeout(room.timer)
  room.timer = null
  if (room.deleted) return
  const state = Y.encodeStateAsUpdate(room.doc)
  q.save.run(state, Date.now(), room.doc.getMap('screens').size, countComments(room.doc), room.id)
}

function getRoom(id) {
  let room = rooms.get(id)
  if (room) return room
  const doc = new Y.Doc({ gc: true })
  const row = q.state.get(id)
  if (row?.state) Y.applyUpdate(doc, new Uint8Array(row.state))
  const awareness = new awarenessProtocol.Awareness(doc)
  awareness.setLocalState(null)
  room = { id, doc, awareness, conns: new Map(), roles: new Map(), timer: null, deleted: false }

  doc.on('update', (update) => {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MSG_SYNC)
    syncProtocol.writeUpdate(enc, update)
    const msg = encoding.toUint8Array(enc)
    for (const conn of room.conns.keys()) sendMsg(room, conn, msg)
    if (!room.timer) room.timer = setTimeout(() => saveRoom(room), 1500)
  })
  awareness.on('update', ({ added, updated, removed }, conn) => {
    const changed = added.concat(updated, removed)
    if (conn !== null && room.conns.has(conn)) {
      const ids = room.conns.get(conn)
      added.forEach((c) => ids.add(c))
      removed.forEach((c) => ids.delete(c))
    }
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MSG_AWARENESS)
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed))
    const msg = encoding.toUint8Array(enc)
    for (const c of room.conns.keys()) sendMsg(room, c, msg)
  })
  rooms.set(id, room)
  return room
}

function onlyTouchesComments(doc, update) {
  const probe = new Y.Doc()
  Y.applyUpdate(probe, Y.encodeStateAsUpdate(doc))
  const comments = probe.getMap('comments')
  let ok = true
  probe.on('afterTransaction', (tr) => {
    tr.changed.forEach((_, type) => {
      if (type !== comments) ok = false
    })
  })
  try {
    Y.applyUpdate(probe, update)
  } catch {
    ok = false
  }
  probe.destroy()
  return ok
}

function sendMsg(room, conn, msg) {
  if (conn.readyState !== 1) return closeConn(room, conn)
  conn.send(msg, (err) => err && closeConn(room, conn))
}

function closeConn(room, conn) {
  if (!room.conns.has(conn)) return
  const ids = room.conns.get(conn)
  room.conns.delete(conn)
  room.roles.delete(conn)
  awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(ids), null)
  if (room.conns.size === 0) {
    saveRoom(room)
    room.doc.destroy()
    rooms.delete(room.id)
  }
  try {
    conn.close()
  } catch {}
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 })
server.on('upgrade', (req, socket, head) => {
  const { pathname, searchParams } = new URL(req.url, 'http://x')
  const m = pathname.match(/^\/ws\/([\w-]+)$/)
  const project = m && q.get.get(m[1])
  const share = searchParams.get('share')
  const member = authed(req)
  const viewer = !member && !!share && !!project && q.shareGet.get(m[1])?.token === share
  if (!project || (!member && !viewer)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    return socket.destroy()
  }
  wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, m[1], viewer ? { viewer: true, token: share } : { viewer: false }))
})

function onConnection(conn, id, role) {
  conn.binaryType = 'arraybuffer'
  const room = getRoom(id)
  room.conns.set(conn, new Set())
  room.roles.set(conn, role)

  conn.on('message', (data) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data))
      const enc = encoding.createEncoder()
      const type = decoding.readVarUint(decoder)
      if (type === MSG_SYNC && role.viewer) {
        // viewers may read everything but only write comments
        const sub = decoding.readVarUint(decoder)
        if (sub === syncProtocol.messageYjsSyncStep1) {
          encoding.writeVarUint(enc, MSG_SYNC)
          syncProtocol.readSyncStep1(decoder, enc, room.doc)
          sendMsg(room, conn, encoding.toUint8Array(enc))
        } else {
          const update = decoding.readVarUint8Array(decoder)
          if (onlyTouchesComments(room.doc, update)) Y.applyUpdate(room.doc, update, conn)
          // a rejected edit would leave this client's later updates unappliable: cut it off so it reloads clean
          else conn.close(4400, 'read-only')
        }
      } else if (type === MSG_SYNC) {
        encoding.writeVarUint(enc, MSG_SYNC)
        syncProtocol.readSyncMessage(decoder, enc, room.doc, conn)
        if (encoding.length(enc) > 1) sendMsg(room, conn, encoding.toUint8Array(enc))
      } else if (type === MSG_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), conn)
      }
    } catch (e) {
      console.error('ws message', e)
    }
  })

  let alive = true
  const ping = setInterval(() => {
    if (!alive) {
      clearInterval(ping)
      return closeConn(room, conn)
    }
    alive = false
    try {
      conn.ping()
    } catch {
      clearInterval(ping)
      closeConn(room, conn)
    }
  }, 30_000)
  conn.on('pong', () => (alive = true))
  conn.on('close', () => {
    clearInterval(ping)
    closeConn(room, conn)
  })

  // initial sync step 1 + current awareness
  const enc = encoding.createEncoder()
  encoding.writeVarUint(enc, MSG_SYNC)
  syncProtocol.writeSyncStep1(enc, room.doc)
  sendMsg(room, conn, encoding.toUint8Array(enc))
  const states = room.awareness.getStates()
  if (states.size > 0) {
    const a = encoding.createEncoder()
    encoding.writeVarUint(a, MSG_AWARENESS)
    encoding.writeVarUint8Array(a, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())))
    sendMsg(room, conn, encoding.toUint8Array(a))
  }
}

function shutdown() {
  for (const room of rooms.values()) saveRoom(room)
  db.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

server.listen(PORT, () => console.log(`Trazo listening on :${PORT}`))
