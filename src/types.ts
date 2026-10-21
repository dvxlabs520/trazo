export type Screen = {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  device: string
  bg?: 'white' | 'light' | 'dark'
}

export type El = {
  id: string
  screenId: string
  type: string
  x: number
  y: number
  w: number
  h: number
  z: number
  props: Record<string, any>
  link?: string | null
}

export type Reply = { id: string; author: string; color: string; text: string; ts: number }

export type Comment = {
  id: string
  screenId: string | null
  x: number
  y: number
  author: string
  color: string
  text: string
  ts: number
  resolved: boolean
  replies: Reply[]
}

export type User = { name: string; color: string }

export const DEVICES: Record<string, { label: string; w: number; h: number }> = {
  iphone: { label: 'iPhone', w: 390, h: 844 },
  android: { label: 'Android', w: 412, h: 915 },
  compact: { label: 'Compacto', w: 360, h: 740 },
  tablet: { label: 'Tablet', w: 820, h: 1180 },
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)
