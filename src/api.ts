import type { User } from './types'
import { getLang, t } from './i18n'

export type ProjectRow = { id: string; name: string; createdAt: number; updatedAt: number; screens: number; comments: number }

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status })
  return data as T
}

export const api = {
  me: () => req<{ ok: boolean }>('GET', '/api/me'),
  login: (code: string) => req<{ ok: boolean }>('POST', '/api/login', { code }),
  logout: () => req('POST', '/api/logout'),
  projects: () => req<ProjectRow[]>('GET', '/api/projects'),
  project: (id: string) => req<ProjectRow>('GET', `/api/projects/${id}`),
  create: (name: string, from?: string) => req<ProjectRow>('POST', '/api/projects', { name, from }),
  rename: (id: string, name: string) => req<ProjectRow>('PATCH', `/api/projects/${id}`, { name }),
  remove: (id: string) => req('DELETE', `/api/projects/${id}`),
  share: (id: string, reset = false) => req<{ token: string }>('POST', `/api/projects/${id}/share`, { reset }),
  shareInfo: (token: string) => req<{ id: string; name: string }>('GET', `/api/share/${token}`),
}

export const COLORS = ['#3b6cf6', '#16a37f', '#f07a2b', '#d6455d', '#2aa5c9', '#c99a06', '#5f8a3a', '#4a5a70', '#b5651d', '#8a6d52', '#0f8f8a', '#e0453a']

export function colorFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

export function getUser(): User | null {
  try {
    const name = localStorage.getItem('trazo.name')
    const color = localStorage.getItem('trazo.color')
    return name ? { name, color: color && COLORS.includes(color) ? color : colorFor(name) } : null
  } catch {
    return null
  }
}

export function saveUser(u: User) {
  try {
    localStorage.setItem('trazo.name', u.name)
    localStorage.setItem('trazo.color', u.color)
  } catch {}
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return t('hace un momento')
  const m = Math.round(s / 60)
  if (m < 60) return t('hace {n} min', { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('hace {n} h', { n: h })
  const d = Math.round(h / 24)
  if (d < 30) return t('hace {n} d', { n: d })
  return new Date(ts).toLocaleDateString(getLang())
}
