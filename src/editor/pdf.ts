import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'
import { DEFS } from '../library'
import { t } from '../i18n'
import type { Snapshot } from '../store'

const W = 842
const H = 595
const M = 40

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// One landscape A4 page per screen: the screen on the left with numbered comment markers,
// its comment threads and outgoing links on the right.
export async function exportProjectPdf(name: string, snap: Snapshot, root: HTMLElement) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const screens = [...snap.screens].sort((a, b) => (a.id === snap.start ? -1 : b.id === snap.start ? 1 : a.x - b.x || a.y - b.y))
  const nameOf = (id: string) => snap.screens.find((s) => s.id === id)?.name || '?'
  const date = new Date().toLocaleDateString(document.documentElement.lang || 'fr')

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i]
    if (i > 0) doc.addPage()
    const node = root.querySelector<HTMLElement>(`[data-screen-id="${s.id}"]`)
    if (!node) continue
    const url = await toPng(node, { pixelRatio: 2, skipFonts: snap.style !== 'sketch' }).catch(() => toPng(node, { pixelRatio: 2, skipFonts: true }))

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(20, 20, 24)
    doc.text(s.name, M, 48)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 128)
    doc.text(`${name} · ${date} · ${i + 1}/${screens.length}`, M, 64)

    const scale = Math.min(330 / s.w, (H - 110) / s.h)
    const iw = s.w * scale
    const ih = s.h * scale
    const ix = M
    const iy = 82
    doc.addImage(url, 'PNG', ix, iy, iw, ih)
    doc.setDrawColor(210, 210, 216)
    doc.setLineWidth(0.6)
    doc.rect(ix, iy, iw, ih)

    const comments = snap.comments.filter((c) => c.screenId === s.id).sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.ts - b.ts)
    comments.forEach((c, k) => {
      const [r, g, b] = rgb(c.resolved ? '#9a9aa2' : c.color)
      doc.setFillColor(r, g, b)
      doc.circle(ix + c.x * scale, iy + c.y * scale, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(String(k + 1), ix + c.x * scale, iy + c.y * scale + 3, { align: 'center' })
    })

    // right column
    const cx = ix + iw + 40
    const cw = W - cx - M
    let y = 96
    const line = (text: string, size: number, color: [number, number, number], bold = false, indent = 0) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, cw - indent) as string[]
      for (const l of lines) {
        if (y > H - M) return false
        doc.text(l, cx + indent, y)
        y += size * 1.35
      }
      return true
    }

    line(`${t('Comentarios')} (${comments.length})`, 13, [20, 20, 24], true)
    y += 6
    if (!comments.length) line(t('Sin comentarios en esta pantalla.'), 10, [120, 120, 128])
    comments.forEach((c, k) => {
      if (y > H - M) return
      const [r, g, b] = rgb(c.resolved ? '#9a9aa2' : c.color)
      doc.setFillColor(r, g, b)
      doc.circle(cx + 7, y - 3.5, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(String(k + 1), cx + 7, y - 0.5, { align: 'center' })
      line(`${c.author}${c.resolved ? ` · ${t('Resuelto')}` : ''}`, 10, [20, 20, 24], true, 22)
      line(c.text, 10, [50, 50, 56], false, 22)
      for (const rep of c.replies) line(`${rep.author}: ${rep.text}`, 9, [100, 100, 108], false, 34)
      y += 8
    })

    const links = (snap.byScreen.get(s.id) || []).filter((e) => e.link)
    if (links.length && y < H - M - 40) {
      y += 8
      line(t('Navegación'), 13, [20, 20, 24], true)
      y += 4
      for (const e of links) {
        const label = e.props.text ? `${t(DEFS[e.type]?.label || e.type)} “${e.props.text}”` : t(DEFS[e.type]?.label || e.type)
        if (!line(`${label}  →  ${nameOf(e.link!)}`, 10, [50, 50, 56])) break
      }
    }
  }

  doc.save(`${name || 'Trazo'}.pdf`)
}
