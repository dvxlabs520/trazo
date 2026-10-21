import { useEffect, useRef, useState } from 'react'
import { initials, timeAgo } from '../api'
import { Icon } from '../icons'
import type { Comment } from '../types'
import type { Snapshot, Store } from '../store'
import { t, tn, useLang } from '../i18n'

export function CommentsPanel({ store, snap, showResolved, setShowResolved, onOpen }: {
  store: Store
  snap: Snapshot
  showResolved: boolean
  setShowResolved: (v: boolean) => void
  onOpen: (c: Comment) => void
}) {
  useLang()
  const open = snap.comments.filter((c) => !c.resolved)
  const done = snap.comments.filter((c) => c.resolved)
  const screenName = (id: string | null) => (id ? store.screens.get(id)?.name : null) || t('Lienzo')
  const list = showResolved ? [...open, ...done] : open
  return (
    <div className="cpanel">
      <div className="insp-head">
        <b>{t('Comentarios')}</b>
        <label className="check small">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          <span>{t('Ver resueltos ({n})', { n: done.length })}</span>
        </label>
      </div>
      {list.length === 0 ? (
        <p className="muted pad">{t('Sin comentarios abiertos. Usa la herramienta Comentar (C) y toca cualquier punto de una pantalla.')}</p>
      ) : (
        <ul className="clist">
          {list.map((c) => (
            <li key={c.id} className={c.resolved ? 'resolved' : ''}>
              <button onClick={() => onOpen(c)}>
                <span className="avatar sm" style={{ background: c.color }}>{initials(c.author)}</span>
                <span className="cbody">
                  <span className="cmeta"><b>{c.author}</b> · {screenName(c.screenId)} · {timeAgo(c.ts)}</span>
                  <span className="ctext">{c.text}</span>
                  {c.replies.length > 0 && <span className="cmeta">{tn(c.replies.length, '{n} respuesta', '{n} respuestas')}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function CommentPopover({ store, comment, draft, style, onClose, onCreated }: {
  store: Store
  comment: Comment | null
  draft: { screenId: string | null; x: number; y: number } | null
  style: React.CSSProperties
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    // avoid popping the keyboard on phones when just reading a thread
    if (draft || matchMedia('(pointer: fine)').matches) ref.current?.focus()
  }, [comment?.id, !!draft])

  function submit() {
    const t = text.trim()
    if (!t) return
    if (draft) {
      const id = store.addComment({ screenId: draft.screenId, x: draft.x, y: draft.y, text: t })
      onCreated(id)
    } else if (comment) {
      store.replyComment(comment.id, t)
    }
    setText('')
  }

  return (
    <div className="cpop" style={style} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="cpop-head">
        <b>{draft ? t('Nuevo comentario') : t('Comentario')}</b>
        <span className="insp-head-tools">
          {comment && (
            <button
              className={'icon-btn' + (comment.resolved ? ' on' : '')}
              title={comment.resolved ? t('Reabrir') : t('Marcar como resuelto')}
              aria-label={comment.resolved ? t('Reabrir') : t('Marcar como resuelto')}
              onClick={() => {
                store.resolveComment(comment.id, !comment.resolved)
                if (!comment.resolved) onClose()
              }}
            >
              <Icon name="check" size={17} />
            </button>
          )}
          {comment && comment.author === store.user.name && (
            <button className="icon-btn" title={t('Eliminar')} aria-label={t('Eliminar comentario')} onClick={() => confirm(t('¿Eliminar este comentario y sus respuestas?')) && (store.deleteComment(comment.id), onClose())}>
              <Icon name="trash" size={17} />
            </button>
          )}
          <button className="icon-btn" title={t('Cerrar')} aria-label={t('Cerrar')} onClick={onClose}><Icon name="close" size={17} /></button>
        </span>
      </div>
      {comment && (
        <div className="thread">
          {[{ id: comment.id, author: comment.author, color: comment.color, text: comment.text, ts: comment.ts }, ...comment.replies].map((r) => (
            <div key={r.id} className="msg">
              <span className="avatar sm" style={{ background: r.color }}>{initials(r.author)}</span>
              <div>
                <div className="cmeta"><b>{r.author}</b> · {timeAgo(r.ts)}</div>
                <div className="ctext">{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="cpop-input">
        <textarea
          ref={ref}
          rows={2}
          value={text}
          placeholder={draft ? t('¿Qué cambiarías aquí?') : t('Responder…')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') onClose()
          }}
        />
        <button className="btn primary sm" onClick={submit} disabled={!text.trim()} aria-label={t('Enviar')}>
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  )
}
