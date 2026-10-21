import type { ReactNode } from 'react'
import { Icon, ICON_NAMES } from './icons'
import { t } from './i18n'

export type Field = {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'bool' | 'range' | 'select' | 'icon' | 'icons'
  options?: [string, string][]
  min?: number
  max?: number
}

export type Def = {
  type: string
  label: string
  cat: string
  w: number | 'full' | 'fill'
  h: number | 'full'
  dock?: 'top' | 'bottom'
  props: Record<string, any>
  fields: Field[]
  render: (p: Record<string, any>, w: number, h: number) => ReactNode
}

export const CATS = ['Sistema', 'Navegación', 'Básicos', 'Formularios', 'Contenido', 'Comercio', 'Social', 'Avisos', 'Formas']

const items = (s: string) =>
  String(s || '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

const F = {
  text: (label = 'Texto', key = 'text'): Field => ({ key, label, kind: 'text' }),
  area: (label = 'Texto', key = 'text'): Field => ({ key, label, kind: 'textarea' }),
  bool: (key: string, label: string): Field => ({ key, label, kind: 'bool' }),
  range: (key: string, label: string, min = 0, max = 100): Field => ({ key, label, kind: 'range', min, max }),
  select: (key: string, label: string, options: [string, string][]): Field => ({ key, label, kind: 'select', options }),
  icon: (key = 'icon', label = 'Icono'): Field => ({ key, label, kind: 'icon' }),
  items: (label = 'Elementos (separados por coma)'): Field => ({ key: 'items', label, kind: 'textarea' }),
  align: (): Field => ({ key: 'align', label: 'Alineación', kind: 'select', options: [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']] }),
}

const Ph = ({ label }: { label?: string }) => (
  <div className="wf-ph">
    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
      <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
    </svg>
    {label ? <span>{label}</span> : null}
  </div>
)

const Bars = ({ n = 2, widths = [100, 70] }: { n?: number; widths?: number[] }) => (
  <div className="wf-bars">
    {Array.from({ length: n }).map((_, i) => (
      <i key={i} style={{ width: `${widths[i % widths.length]}%` }} />
    ))}
  </div>
)

export const LIBRARY: Def[] = [
  // ---------- Sistema ----------
  {
    type: 'statusbar', label: 'Barra de estado', cat: 'Sistema', w: 'full', h: 44, dock: 'top',
    props: { time: '9:41', dark: false }, fields: [F.text('Hora', 'time'), F.bool('dark', 'Oscura')],
    render: (p) => (
      <div className={'wf-status' + (p.dark ? ' is-dark' : '')}>
        <b>{p.time}</b>
        <span className="wf-status-icons">
          <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
          <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 11L5.5 8a3.5 3.5 0 015 0zM2.7 5.3a7.5 7.5 0 0110.6 0L12 6.6a5.6 5.6 0 00-8 0zM0 2.6a11.3 11.3 0 0116 0L14.6 4A9.4 9.4 0 001.4 4z" /></svg>
          <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45" /><rect x="2.5" y="2.5" width="16" height="7" rx="1.6" /><rect x="23.5" y="4" width="2" height="4" rx="1" opacity=".45" /></svg>
        </span>
      </div>
    ),
  },
  {
    type: 'homebar', label: 'Indicador de inicio', cat: 'Sistema', w: 'full', h: 34, dock: 'bottom',
    props: {}, fields: [],
    render: () => <div className="wf-homebar"><i /></div>,
  },
  {
    type: 'keyboard', label: 'Teclado', cat: 'Sistema', w: 'full', h: 260, dock: 'bottom',
    props: {}, fields: [],
    render: () => (
      <div className="wf-kbd">
        {['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'].map((row, r) => (
          <div key={r} className="wf-kbd-row">
            {r === 2 && <span className="k wide">⇧</span>}
            {row.split('').map((c) => <span key={c} className="k">{c}</span>)}
            {r === 2 && <span className="k wide">⌫</span>}
          </div>
        ))}
        <div className="wf-kbd-row">
          <span className="k wide">123</span>
          <span className="k space">{t('espacio')}</span>
          <span className="k wide">{t('ir')}</span>
        </div>
      </div>
    ),
  },

  // ---------- Navegación ----------
  {
    type: 'appbar', label: 'Barra superior', cat: 'Navegación', w: 'full', h: 52, dock: 'top',
    props: { text: 'Título', back: true, action: 'more' },
    fields: [F.text('Título'), F.bool('back', 'Botón atrás'), F.select('action', 'Acción', [['none', 'Ninguna'], ['more', 'Más'], ['search', 'Buscar'], ['share', 'Compartir'], ['settings', 'Ajustes'], ['plus', 'Añadir']])],
    render: (p) => (
      <div className="wf-appbar">
        <span className="slot">{p.back ? <Icon name="back" size={22} /> : null}</span>
        <b>{p.text}</b>
        <span className="slot">{p.action !== 'none' ? <Icon name={p.action} size={22} /> : null}</span>
      </div>
    ),
  },
  {
    type: 'largetitle', label: 'Título grande', cat: 'Navegación', w: 'fill', h: 44,
    props: { text: 'Inicio' }, fields: [F.text('Título')],
    render: (p) => <div className="wf-largetitle">{p.text}</div>,
  },
  {
    type: 'tabbar', label: 'Barra de pestañas', cat: 'Navegación', w: 'full', h: 82, dock: 'bottom',
    props: { items: 'Inicio, Buscar, Favoritos, Perfil', icons: 'home, search, heart, user', active: 0 },
    fields: [F.items('Pestañas'), { key: 'icons', label: 'Iconos', kind: 'icons' }, F.range('active', 'Activa', 0, 5)],
    render: (p) => {
      const its = items(p.items)
      const ics = items(p.icons)
      return (
        <div className="wf-tabbar">
          {its.map((t, i) => (
            <span key={i} className={i === Number(p.active) ? 'on' : ''}>
              <Icon name={ics[i] || 'star'} size={22} />
              <small>{t}</small>
            </span>
          ))}
        </div>
      )
    },
  },
  {
    type: 'search', label: 'Buscador', cat: 'Navegación', w: 'fill', h: 40,
    props: { text: 'Buscar' }, fields: [F.text('Texto de ejemplo')],
    render: (p) => <div className="wf-search"><Icon name="search" size={18} /><span>{p.text}</span></div>,
  },
  {
    type: 'segmented', label: 'Control segmentado', cat: 'Navegación', w: 'fill', h: 36,
    props: { items: 'Día, Semana, Mes', active: 0 }, fields: [F.items('Opciones'), F.range('active', 'Activa', 0, 5)],
    render: (p) => (
      <div className="wf-seg">
        {items(p.items).map((t, i) => <span key={i} className={i === Number(p.active) ? 'on' : ''}>{t}</span>)}
      </div>
    ),
  },
  {
    type: 'tabs', label: 'Pestañas superiores', cat: 'Navegación', w: 'full', h: 44,
    props: { items: 'Todo, Recientes, Guardados', active: 0 }, fields: [F.items('Pestañas'), F.range('active', 'Activa', 0, 5)],
    render: (p) => (
      <div className="wf-tabs">
        {items(p.items).map((t, i) => <span key={i} className={i === Number(p.active) ? 'on' : ''}>{t}</span>)}
      </div>
    ),
  },
  {
    type: 'drawer', label: 'Menú lateral', cat: 'Navegación', w: 300, h: 'full',
    props: { text: 'Ana Pérez', items: 'Inicio, Pedidos, Mensajes, Ajustes, Ayuda' }, fields: [F.text('Nombre'), F.items('Opciones')],
    render: (p) => (
      <div className="wf-drawer">
        <div className="wf-drawer-head"><span className="wf-avatar" style={{ width: 48, height: 48 }}>{initials(p.text)}</span><b>{p.text}</b></div>
        {items(p.items).map((t, i) => <div key={i} className="wf-drawer-item"><i />{t}</div>)}
      </div>
    ),
  },
  {
    type: 'dots', label: 'Indicador de página', cat: 'Navegación', w: 72, h: 10,
    props: { count: 4, active: 0 }, fields: [F.range('count', 'Cantidad', 2, 8), F.range('active', 'Activo', 0, 7)],
    render: (p) => (
      <div className="wf-dots">
        {Array.from({ length: Number(p.count) }).map((_, i) => <i key={i} className={i === Number(p.active) ? 'on' : ''} />)}
      </div>
    ),
  },
  {
    type: 'steps', label: 'Progreso por pasos', cat: 'Navegación', w: 'fill', h: 28,
    props: { count: 4, active: 1 }, fields: [F.range('count', 'Pasos', 2, 6), F.range('active', 'Actual', 0, 5)],
    render: (p) => (
      <div className="wf-steps">
        {Array.from({ length: Number(p.count) }).map((_, i) => <i key={i} className={i <= Number(p.active) ? 'on' : ''} />)}
      </div>
    ),
  },

  // ---------- Básicos ----------
  {
    type: 'heading', label: 'Título', cat: 'Básicos', w: 'fill', h: 34,
    props: { text: 'Un título claro', size: 'm', align: 'left' },
    fields: [F.text('Título'), F.select('size', 'Tamaño', [['s', 'Pequeño'], ['m', 'Mediano'], ['l', 'Grande']]), F.align()],
    render: (p) => <div className={`wf-heading s-${p.size}`} style={{ textAlign: p.align }}>{p.text}</div>,
  },
  {
    type: 'text', label: 'Párrafo', cat: 'Básicos', w: 'fill', h: 60,
    props: { text: 'Describe aquí lo que verá la persona en esta pantalla y por qué le importa.', align: 'left', muted: false },
    fields: [F.area('Texto'), F.align(), F.bool('muted', 'Gris')],
    render: (p) => <div className={'wf-text' + (p.muted ? ' muted' : '')} style={{ textAlign: p.align }}>{p.text}</div>,
  },
  {
    type: 'lines', label: 'Texto simulado', cat: 'Básicos', w: 'fill', h: 52,
    props: { count: 3 }, fields: [F.range('count', 'Líneas', 1, 8)],
    render: (p) => <Bars n={Number(p.count)} widths={[100, 92, 64, 86]} />,
  },
  {
    type: 'button', label: 'Botón', cat: 'Básicos', w: 'fill', h: 48,
    props: { text: 'Continuar', variant: 'primary', icon: 'none' },
    fields: [F.text('Texto'), F.select('variant', 'Estilo', [['primary', 'Principal'], ['secondary', 'Secundario'], ['ghost', 'Solo texto'], ['danger', 'Peligro']]), { key: 'icon', label: 'Icono', kind: 'icon' }],
    render: (p) => (
      <div className={`wf-btn v-${p.variant}`}>
        {p.icon && p.icon !== 'none' ? <Icon name={p.icon} size={18} /> : null}
        <span>{p.text}</span>
      </div>
    ),
  },
  {
    type: 'iconbutton', label: 'Botón de icono', cat: 'Básicos', w: 44, h: 44,
    props: { icon: 'heart', filled: false }, fields: [F.icon(), F.bool('filled', 'Relleno')],
    render: (p) => <div className={'wf-iconbtn' + (p.filled ? ' filled' : '')}><Icon name={p.icon} size={22} /></div>,
  },
  {
    type: 'fab', label: 'Botón flotante', cat: 'Básicos', w: 56, h: 56,
    props: { icon: 'plus' }, fields: [F.icon()],
    render: (p) => <div className="wf-fab"><Icon name={p.icon} size={26} /></div>,
  },
  {
    type: 'link', label: 'Enlace', cat: 'Básicos', w: 160, h: 22,
    props: { text: '¿Olvidaste tu contraseña?', align: 'left' }, fields: [F.text('Texto'), F.align()],
    render: (p) => <div className="wf-link" style={{ textAlign: p.align }}>{p.text}</div>,
  },
  {
    type: 'chips', label: 'Chips', cat: 'Básicos', w: 'fill', h: 32,
    props: { items: 'Todo, Cerca, Abierto, Ofertas', active: 0 }, fields: [F.items('Chips'), F.range('active', 'Activo', -1, 7)],
    render: (p) => (
      <div className="wf-chips">
        {items(p.items).map((t, i) => <span key={i} className={i === Number(p.active) ? 'on' : ''}>{t}</span>)}
      </div>
    ),
  },
  {
    type: 'badge', label: 'Insignia', cat: 'Básicos', w: 24, h: 24,
    props: { text: '3' }, fields: [F.text('Texto')],
    render: (p) => <div className="wf-badge">{p.text}</div>,
  },
  {
    type: 'tag', label: 'Etiqueta', cat: 'Básicos', w: 80, h: 26,
    props: { text: 'Nuevo' }, fields: [F.text('Texto')],
    render: (p) => <div className="wf-tag">{p.text}</div>,
  },
  {
    type: 'icon', label: 'Icono', cat: 'Básicos', w: 32, h: 32,
    props: { icon: 'star' }, fields: [F.icon()],
    render: (p, w, h) => <div className="wf-icon"><Icon name={p.icon} size={Math.min(w, h)} stroke={1.8} /></div>,
  },
  {
    type: 'divider', label: 'Separador', cat: 'Básicos', w: 'fill', h: 9,
    props: {}, fields: [],
    render: () => <div className="wf-divider"><i /></div>,
  },

  // ---------- Formularios ----------
  {
    type: 'input', label: 'Campo de texto', cat: 'Formularios', w: 'fill', h: 70,
    props: { label: 'Correo electrónico', text: 'nombre@correo.com', icon: 'none', state: 'normal' },
    fields: [F.text('Etiqueta', 'label'), F.text('Texto de ejemplo'), { key: 'icon', label: 'Icono', kind: 'icon' }, F.select('state', 'Estado', [['normal', 'Normal'], ['focus', 'Activo'], ['error', 'Error']])],
    render: (p) => (
      <div className={`wf-field st-${p.state}`}>
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-input">
          {p.icon && p.icon !== 'none' ? <Icon name={p.icon} size={18} /> : null}
          <span>{p.text}</span>
        </div>
        {p.state === 'error' ? <small>{t('Revisa este campo')}</small> : null}
      </div>
    ),
  },
  {
    type: 'password', label: 'Contraseña', cat: 'Formularios', w: 'fill', h: 70,
    props: { label: 'Contraseña' }, fields: [F.text('Etiqueta', 'label')],
    render: (p) => (
      <div className="wf-field">
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-input"><span>••••••••</span><Icon name="lock" size={18} style={{ marginLeft: 'auto' }} /></div>
      </div>
    ),
  },
  {
    type: 'textarea', label: 'Área de texto', cat: 'Formularios', w: 'fill', h: 130,
    props: { label: 'Comentarios', text: 'Escribe aquí…' }, fields: [F.text('Etiqueta', 'label'), F.text('Texto de ejemplo')],
    render: (p) => (
      <div className="wf-field grow">
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-input area"><span>{p.text}</span></div>
      </div>
    ),
  },
  {
    type: 'select', label: 'Desplegable', cat: 'Formularios', w: 'fill', h: 70,
    props: { label: 'País', text: 'México' }, fields: [F.text('Etiqueta', 'label'), F.text('Valor')],
    render: (p) => (
      <div className="wf-field">
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-input"><span className="val">{p.text}</span><Icon name="down" size={18} style={{ marginLeft: 'auto' }} /></div>
      </div>
    ),
  },
  {
    type: 'checkbox', label: 'Casilla', cat: 'Formularios', w: 'fill', h: 26,
    props: { text: 'Acepto los términos', checked: true }, fields: [F.text('Texto'), F.bool('checked', 'Marcada')],
    render: (p) => <div className="wf-check"><i className={p.checked ? 'on' : ''}>{p.checked ? <Icon name="check" size={14} stroke={3} /> : null}</i>{p.text}</div>,
  },
  {
    type: 'radio', label: 'Opción única', cat: 'Formularios', w: 'fill', h: 26,
    props: { text: 'Envío estándar', checked: true }, fields: [F.text('Texto'), F.bool('checked', 'Elegida')],
    render: (p) => <div className="wf-check radio"><i className={p.checked ? 'on' : ''} />{p.text}</div>,
  },
  {
    type: 'switch', label: 'Interruptor', cat: 'Formularios', w: 'fill', h: 32,
    props: { text: 'Notificaciones', checked: true }, fields: [F.text('Texto'), F.bool('checked', 'Activo')],
    render: (p) => <div className="wf-switchrow"><span>{p.text}</span><i className={'wf-switch' + (p.checked ? ' on' : '')} /></div>,
  },
  {
    type: 'slider', label: 'Deslizador', cat: 'Formularios', w: 'fill', h: 28,
    props: { value: 40 }, fields: [F.range('value', 'Valor')],
    render: (p) => <div className="wf-slider"><i style={{ width: `${p.value}%` }} /><b style={{ left: `${p.value}%` }} /></div>,
  },
  {
    type: 'otp', label: 'Código de verificación', cat: 'Formularios', w: 'fill', h: 56,
    props: { count: 6, filled: 2 }, fields: [F.range('count', 'Dígitos', 4, 8), F.range('filled', 'Escritos', 0, 8)],
    render: (p) => (
      <div className="wf-otp">
        {Array.from({ length: Number(p.count) }).map((_, i) => <span key={i} className={i === Number(p.filled) ? 'focus' : ''}>{i < Number(p.filled) ? String((i * 7 + 3) % 10) : ''}</span>)}
      </div>
    ),
  },
  {
    type: 'counter', label: 'Contador', cat: 'Formularios', w: 120, h: 40,
    props: { value: 1 }, fields: [F.range('value', 'Valor', 0, 99)],
    render: (p) => <div className="wf-counter"><Icon name="minus" size={18} /><b>{p.value}</b><Icon name="plus" size={18} /></div>,
  },
  {
    type: 'calendar', label: 'Calendario', cat: 'Formularios', w: 'fill', h: 300,
    props: { text: 'Octubre 2026', day: 21 }, fields: [F.text('Mes'), F.range('day', 'Día elegido', 1, 31)],
    render: (p) => (
      <div className="wf-cal">
        <div className="wf-cal-head"><Icon name="back" size={18} /><b>{p.text}</b><Icon name="chevron" size={18} /></div>
        <div className="wf-cal-grid">
          {t('LMXJVSD').split('').map((d, i) => <small key={i}>{d}</small>)}
          {Array.from({ length: 35 }).map((_, i) => {
            const d = i - 2
            return <span key={i} className={d === Number(p.day) ? 'on' : ''}>{d > 0 && d <= 31 ? d : ''}</span>
          })}
        </div>
      </div>
    ),
  },

  // ---------- Contenido ----------
  {
    type: 'image', label: 'Imagen', cat: 'Contenido', w: 'fill', h: 180,
    props: { text: '', round: false }, fields: [F.text('Descripción'), F.bool('round', 'Esquinas redondas')],
    render: (p) => <div className={'wf-imgwrap' + (p.round ? ' round' : '')}><Ph label={p.text} /></div>,
  },
  {
    type: 'avatar', label: 'Avatar', cat: 'Contenido', w: 48, h: 48,
    props: { text: 'AP' }, fields: [F.text('Iniciales')],
    render: (p) => <div className="wf-avatar">{p.text}</div>,
  },
  {
    type: 'card', label: 'Tarjeta', cat: 'Contenido', w: 'fill', h: 250,
    props: { text: 'Título de la tarjeta', sub: 'Texto de apoyo breve en dos líneas como máximo.', meta: '$240' },
    fields: [F.text('Título'), F.text('Texto', 'sub'), F.text('Dato', 'meta')],
    render: (p) => (
      <div className="wf-card">
        <div className="wf-card-img"><Ph /></div>
        <div className="wf-card-body">
          <div className="row"><b>{p.text}</b>{p.meta ? <span>{p.meta}</span> : null}</div>
          <p>{p.sub}</p>
        </div>
      </div>
    ),
  },
  {
    type: 'listitem', label: 'Fila de lista', cat: 'Contenido', w: 'full', h: 68,
    props: { text: 'Ana Pérez', sub: 'Último mensaje · 10:24', lead: 'avatar', trail: 'chevron' },
    fields: [F.text('Título'), F.text('Subtítulo', 'sub'), F.select('lead', 'Inicio (fila)', [['avatar', 'Avatar'], ['image', 'Imagen'], ['icon', 'Icono'], ['none', 'Nada']]), F.select('trail', 'Final (fila)', [['chevron', 'Flecha'], ['switch', 'Interruptor'], ['badge', 'Insignia'], ['text', 'Hora'], ['none', 'Nada']])],
    render: (p) => <ListRow p={p} />,
  },
  {
    type: 'list', label: 'Lista', cat: 'Contenido', w: 'full', h: 260,
    props: { items: 'Perfil, Notificaciones, Privacidad, Métodos de pago, Ayuda', lead: 'icon', trail: 'chevron' },
    fields: [F.items('Filas'), F.select('lead', 'Inicio (fila)', [['icon', 'Icono'], ['avatar', 'Avatar'], ['none', 'Nada']]), F.select('trail', 'Final (fila)', [['chevron', 'Flecha'], ['switch', 'Interruptor'], ['none', 'Nada']])],
    render: (p) => (
      <div className="wf-list">
        {items(p.items).map((t, i) => <ListRow key={i} p={{ text: t, lead: p.lead, trail: p.trail, compact: true }} />)}
      </div>
    ),
  },
  {
    type: 'gallery', label: 'Galería', cat: 'Contenido', w: 'fill', h: 230,
    props: { cols: 3, count: 6 }, fields: [F.range('cols', 'Columnas', 2, 4), F.range('count', 'Imágenes', 2, 12)],
    render: (p) => (
      <div className="wf-gallery" style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }}>
        {Array.from({ length: Number(p.count) }).map((_, i) => <div key={i}><Ph /></div>)}
      </div>
    ),
  },
  {
    type: 'carousel', label: 'Carrusel', cat: 'Contenido', w: 'full', h: 210,
    props: { count: 4 }, fields: [F.range('count', 'Diapositivas', 2, 6)],
    render: (p) => (
      <div className="wf-carousel">
        <div className="track"><div><Ph /></div><div><Ph /></div></div>
        <div className="wf-dots">{Array.from({ length: Number(p.count) }).map((_, i) => <i key={i} className={i === 0 ? 'on' : ''} />)}</div>
      </div>
    ),
  },
  {
    type: 'video', label: 'Video', cat: 'Contenido', w: 'fill', h: 200,
    props: { time: '2:45' }, fields: [F.text('Duración', 'time')],
    render: (p) => (
      <div className="wf-video">
        <span className="play"><Icon name="play" size={24} /></span>
        <div className="bar"><i /><small>{p.time}</small></div>
      </div>
    ),
  },
  {
    type: 'map', label: 'Mapa', cat: 'Contenido', w: 'fill', h: 220,
    props: {}, fields: [],
    render: () => (
      <div className="wf-map">
        <svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
          <path d="M-5 30 Q60 40 90 20 T205 35M-5 90 Q50 70 100 85 T205 70M40 -5 Q50 60 30 125M130 -5 Q120 50 150 125" fill="none" strokeWidth="5" />
          <path d="M-5 60 L205 55M90 -5 L95 125" fill="none" strokeWidth="2.5" />
        </svg>
        <span className="mpin"><Icon name="pin" size={30} /></span>
      </div>
    ),
  },
  {
    type: 'barchart', label: 'Gráfica de barras', cat: 'Contenido', w: 'fill', h: 160,
    props: { items: '40, 65, 30, 80, 55, 90, 45' }, fields: [F.items('Valores')],
    render: (p) => {
      const v = items(p.items).map(Number).filter((n) => !isNaN(n))
      const max = Math.max(1, ...v)
      return <div className="wf-bars-chart">{v.map((n, i) => <i key={i} style={{ height: `${(n / max) * 100}%` }} />)}</div>
    },
  },
  {
    type: 'linechart', label: 'Gráfica de líneas', cat: 'Contenido', w: 'fill', h: 160,
    props: { items: '20, 35, 30, 55, 48, 70, 82' }, fields: [F.items('Valores')],
    render: (p) => {
      const v = items(p.items).map(Number).filter((n) => !isNaN(n))
      const max = Math.max(1, ...v)
      const pts = v.map((n, i) => `${(i / Math.max(1, v.length - 1)) * 100},${100 - (n / max) * 92}`).join(' ')
      return (
        <div className="wf-linechart">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points={`0,100 ${pts} 100,100`} className="area" />
            <polyline points={pts} fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )
    },
  },
  {
    type: 'progress', label: 'Barra de progreso', cat: 'Contenido', w: 'fill', h: 8,
    props: { value: 60 }, fields: [F.range('value', 'Valor')],
    render: (p) => <div className="wf-progress"><i style={{ width: `${p.value}%` }} /></div>,
  },
  {
    type: 'rating', label: 'Valoración', cat: 'Contenido', w: 128, h: 24,
    props: { value: 4 }, fields: [F.range('value', 'Estrellas', 0, 5)],
    render: (p) => (
      <div className="wf-rating">
        {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < Number(p.value) ? 'on' : ''}><Icon name="star" size={20} /></span>)}
      </div>
    ),
  },
  {
    type: 'stat', label: 'Métrica', cat: 'Contenido', w: 160, h: 84,
    props: { text: '$12,480', sub: 'Ventas del mes' }, fields: [F.text('Valor'), F.text('Descripción', 'sub')],
    render: (p) => <div className="wf-stat"><b>{p.text}</b><span>{p.sub}</span></div>,
  },
  {
    type: 'bubble', label: 'Mensaje de chat', cat: 'Contenido', w: 'fill', h: 56,
    props: { text: '¿Nos vemos a las 6?', mine: false }, fields: [F.text('Mensaje'), F.bool('mine', 'Enviado por mí')],
    render: (p) => <div className={'wf-bubble' + (p.mine ? ' mine' : '')}><span>{p.text}</span></div>,
  },
  {
    type: 'table', label: 'Tabla', cat: 'Contenido', w: 'fill', h: 170,
    props: { items: 'Producto, Cant., Total\nCafé, 2, $90\nPan, 1, $35\nJugo, 3, $120' }, fields: [F.items('Filas (una por línea, columnas con coma)')],
    render: (p) => (
      <div className="wf-table">
        {String(p.items).split('\n').filter(Boolean).map((row, r) => (
          <div key={r} className={r === 0 ? 'head' : ''}>{row.split(',').map((c, i) => <span key={i}>{c.trim()}</span>)}</div>
        ))}
      </div>
    ),
  },

  // ---------- Avisos ----------
  {
    type: 'dialog', label: 'Diálogo', cat: 'Avisos', w: 300, h: 190,
    props: { text: '¿Eliminar elemento?', sub: 'Esta acción no se puede deshacer.', ok: 'Eliminar', cancel: 'Cancelar' },
    fields: [F.text('Título'), F.text('Mensaje', 'sub'), F.text('Botón principal', 'ok'), F.text('Botón secundario', 'cancel')],
    render: (p) => (
      <div className="wf-dialog">
        <b>{p.text}</b>
        <p>{p.sub}</p>
        <div className="actions"><span className="wf-btn v-ghost">{p.cancel}</span><span className="wf-btn v-primary">{p.ok}</span></div>
      </div>
    ),
  },
  {
    type: 'sheet', label: 'Hoja inferior', cat: 'Avisos', w: 'full', h: 320, dock: 'bottom',
    props: { text: 'Compartir', items: 'Copiar enlace, Enviar por mensaje, Guardar, Reportar' }, fields: [F.text('Título'), F.items('Opciones')],
    render: (p) => (
      <div className="wf-sheet">
        <i className="grab" />
        <b>{p.text}</b>
        {items(p.items).map((t, i) => <div key={i} className="opt"><span className="ico" />{t}</div>)}
      </div>
    ),
  },
  {
    type: 'scrim', label: 'Fondo oscuro', cat: 'Avisos', w: 'full', h: 'full',
    props: { value: 45 }, fields: [F.range('value', 'Opacidad')],
    render: (p) => <div className="wf-scrim" style={{ opacity: Number(p.value) / 100 }} />,
  },
  {
    type: 'toast', label: 'Aviso breve', cat: 'Avisos', w: 'fill', h: 48,
    props: { text: 'Guardado correctamente', action: 'Deshacer' }, fields: [F.text('Mensaje'), F.text('Acción', 'action')],
    render: (p) => <div className="wf-toast"><span>{p.text}</span>{p.action ? <b>{p.action}</b> : null}</div>,
  },
  {
    type: 'alert', label: 'Alerta', cat: 'Avisos', w: 'fill', h: 72,
    props: { text: 'Sin conexión', sub: 'Revisa tu red e inténtalo de nuevo.', kind: 'warn' },
    fields: [F.text('Título'), F.text('Mensaje', 'sub'), F.select('kind', 'Tipo', [['info', 'Información'], ['warn', 'Advertencia'], ['ok', 'Éxito']])],
    render: (p) => (
      <div className={`wf-alert k-${p.kind}`}>
        <Icon name={p.kind === 'ok' ? 'check' : p.kind === 'warn' ? 'bell' : 'chat'} size={20} />
        <div><b>{p.text}</b><span>{p.sub}</span></div>
      </div>
    ),
  },
  {
    type: 'spinner', label: 'Cargando', cat: 'Avisos', w: 40, h: 40,
    props: {}, fields: [],
    render: () => <div className="wf-spinner"><i /></div>,
  },
  {
    type: 'skeleton', label: 'Esqueleto de carga', cat: 'Avisos', w: 'fill', h: 96,
    props: {}, fields: [],
    render: () => (
      <div className="wf-skeleton">
        <i className="sq" />
        <div><i style={{ width: '80%' }} /><i style={{ width: '55%' }} /><i style={{ width: '65%' }} /></div>
      </div>
    ),
  },
  {
    type: 'empty', label: 'Estado vacío', cat: 'Avisos', w: 'fill', h: 240,
    props: { text: 'Aún no hay pedidos', sub: 'Cuando hagas tu primer pedido aparecerá aquí.', cta: 'Explorar', icon: 'cart' },
    fields: [F.text('Título'), F.text('Texto', 'sub'), F.text('Botón', 'cta'), F.icon()],
    render: (p) => (
      <div className="wf-empty">
        <span className="ico"><Icon name={p.icon} size={34} stroke={1.6} /></span>
        <b>{p.text}</b>
        <p>{p.sub}</p>
        {p.cta ? <span className="wf-btn v-secondary">{p.cta}</span> : null}
      </div>
    ),
  },

  // ---------- Navegación (más) ----------
  {
    type: 'sectionheader', label: 'Encabezado de sección', cat: 'Navegación', w: 'fill', h: 28,
    props: { text: 'Populares', link: 'Ver todo' }, fields: [F.text('Título'), F.text('Enlace', 'link')],
    render: (p) => <div className="wf-sechead"><b>{p.text}</b>{p.link ? <span>{p.link}</span> : null}</div>,
  },
  {
    type: 'chatheader', label: 'Encabezado de chat', cat: 'Navegación', w: 'full', h: 60, dock: 'top',
    props: { text: 'Ana Pérez', sub: 'En línea' }, fields: [F.text('Nombre'), F.text('Estado', 'sub')],
    render: (p) => (
      <div className="wf-chathead">
        <Icon name="back" size={22} />
        <span className="wf-avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{initials(p.text)}</span>
        <div className="txt"><b>{p.text}</b><small>{p.sub}</small></div>
        <Icon name="call" size={20} />
        <Icon name="video" size={22} />
      </div>
    ),
  },
  {
    type: 'heroheader', label: 'Cabecera con imagen', cat: 'Navegación', w: 'full', h: 260,
    props: { text: 'Casa en la playa', sub: 'Tulum, México' }, fields: [F.text('Título'), F.text('Subtítulo', 'sub')],
    render: (p) => (
      <div className="wf-hero">
        <Ph />
        <div className="wf-hero-top"><span className="wf-hero-btn"><Icon name="back" size={20} /></span><span className="wf-hero-btn"><Icon name="heart" size={20} /></span></div>
        <div className="wf-hero-txt"><b>{p.text}</b><small>{p.sub}</small></div>
      </div>
    ),
  },
  {
    type: 'toolbar', label: 'Barra de herramientas', cat: 'Navegación', w: 'full', h: 56,
    props: { items: 'Editar, Compartir, Me gusta, Borrar', icons: 'edit, share, heart, trash' }, fields: [F.items('Acciones'), { key: 'icons', label: 'Iconos', kind: 'icons' }],
    render: (p) => {
      const ics = items(p.icons)
      return <div className="wf-toolbar">{items(p.items).map((_, i) => <Icon key={i} name={ics[i] || 'star'} size={22} />)}</div>
    },
  },
  {
    type: 'accordion', label: 'Acordeón', cat: 'Navegación', w: 'fill', h: 210,
    props: { items: 'Envíos, Devoluciones, Métodos de pago', open: 0 }, fields: [F.items('Secciones'), F.range('open', 'Abierta', -1, 5)],
    render: (p) => (
      <div className="wf-accordion">
        {items(p.items).map((x, i) => (
          <div key={i} className={'acc' + (i === Number(p.open) ? ' open' : '')}>
            <div className="acc-h"><b>{x}</b><Icon name={i === Number(p.open) ? 'minus' : 'plus'} size={18} /></div>
            {i === Number(p.open) ? <Bars n={2} widths={[100, 70]} /> : null}
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'pagination', label: 'Paginación', cat: 'Navegación', w: 'fill', h: 40,
    props: { count: 5, active: 1 }, fields: [F.range('count', 'Páginas', 2, 9), F.range('active', 'Actual', 0, 8)],
    render: (p) => (
      <div className="wf-pages">
        <Icon name="back" size={18} />
        {Array.from({ length: Number(p.count) }).map((_, i) => <span key={i} className={i === Number(p.active) ? 'on' : ''}>{i + 1}</span>)}
        <Icon name="chevron" size={18} />
      </div>
    ),
  },

  // ---------- Básicos (más) ----------
  {
    type: 'buttongroup', label: 'Par de botones', cat: 'Básicos', w: 'fill', h: 48,
    props: { text: 'Cancelar', ok: 'Guardar' }, fields: [F.text('Secundario'), F.text('Principal', 'ok')],
    render: (p) => <div className="wf-btngroup"><span className="wf-btn v-secondary">{p.text}</span><span className="wf-btn v-primary">{p.ok}</span></div>,
  },
  {
    type: 'social', label: 'Acceso con cuenta', cat: 'Básicos', w: 'fill', h: 48,
    props: { text: 'Continuar con Google', letter: 'G' }, fields: [F.text('Texto'), F.text('Letra del logo', 'letter')],
    render: (p) => <div className="wf-social"><span className="mark">{p.letter}</span><span>{p.text}</span></div>,
  },
  {
    type: 'avatars', label: 'Grupo de avatares', cat: 'Básicos', w: 140, h: 36,
    props: { count: 4, extra: '+12' }, fields: [F.range('count', 'Cantidad', 2, 6), F.text('Resto', 'extra')],
    render: (p) => (
      <div className="wf-avatars">
        {Array.from({ length: Number(p.count) }).map((_, i) => <span key={i} className="wf-avatar">{'ABCDEF'[i]}</span>)}
        {p.extra ? <span className="wf-avatar more">{p.extra}</span> : null}
      </div>
    ),
  },
  {
    type: 'quote', label: 'Cita', cat: 'Básicos', w: 'fill', h: 96,
    props: { text: 'La mejor app para organizar mis viajes.', sub: 'Laura M.' }, fields: [F.area('Texto'), F.text('Autor', 'sub')],
    render: (p) => <div className="wf-quote"><p>“{p.text}”</p><small>{p.sub}</small></div>,
  },
  {
    type: 'logo', label: 'Logotipo', cat: 'Básicos', w: 150, h: 40,
    props: { text: 'Marca' }, fields: [F.text('Nombre')],
    render: (p) => <div className="wf-logo"><i /><b>{p.text}</b></div>,
  },
  {
    type: 'kv', label: 'Fila de dato', cat: 'Básicos', w: 'fill', h: 36,
    props: { text: 'Subtotal', value: '$240' }, fields: [F.text('Etiqueta'), F.text('Valor', 'value')],
    render: (p) => <div className="wf-kv"><span>{p.text}</span><b>{p.value}</b></div>,
  },

  // ---------- Formularios (más) ----------
  {
    type: 'datefield', label: 'Campo de fecha', cat: 'Formularios', w: 'fill', h: 70,
    props: { label: 'Fecha de llegada', text: '21/10/2026' }, fields: [F.text('Etiqueta', 'label'), F.text('Valor')],
    render: (p) => (
      <div className="wf-field">
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-input"><span className="val">{p.text}</span><Icon name="calendar" size={18} style={{ marginLeft: 'auto' }} /></div>
      </div>
    ),
  },
  {
    type: 'timepicker', label: 'Selector de hora', cat: 'Formularios', w: 'fill', h: 170,
    props: { hour: 9, minute: 30 }, fields: [F.range('hour', 'Hora', 0, 23), F.range('minute', 'Minutos', 0, 59)],
    render: (p) => {
      const col = (v: number, max: number) => [-2, -1, 0, 1, 2].map((d) => <span key={d} className={d === 0 ? 'on' : Math.abs(d) === 2 ? 'far' : ''}>{String((v + d + max) % max).padStart(2, '0')}</span>)
      return <div className="wf-wheel"><div>{col(Number(p.hour), 24)}</div><b>:</b><div>{col(Number(p.minute), 60)}</div><i /></div>
    },
  },
  {
    type: 'phone', label: 'Número de teléfono', cat: 'Formularios', w: 'fill', h: 70,
    props: { label: 'Teléfono', code: '+33', text: '6 12 34 56 78' }, fields: [F.text('Etiqueta', 'label'), F.text('Prefijo', 'code'), F.text('Número')],
    render: (p) => (
      <div className="wf-field">
        {p.label ? <label>{p.label}</label> : null}
        <div className="wf-phone"><span className="wf-input code">{p.code}<Icon name="down" size={14} /></span><span className="wf-input"><span className="val">{p.text}</span></span></div>
      </div>
    ),
  },
  {
    type: 'cardform', label: 'Datos de tarjeta', cat: 'Formularios', w: 'fill', h: 196,
    props: { label: 'Número de tarjeta' }, fields: [F.text('Etiqueta', 'label')],
    render: (p) => (
      <div className="wf-cardform">
        <div className="wf-field"><label>{p.label}</label><div className="wf-input"><Icon name="card" size={18} /><span>0000 0000 0000 0000</span></div></div>
        <div className="row">
          <div className="wf-field"><label>MM/AA</label><div className="wf-input"><span>12/28</span></div></div>
          <div className="wf-field"><label>CVC</label><div className="wf-input"><span>•••</span></div></div>
        </div>
      </div>
    ),
  },
  {
    type: 'upload', label: 'Subir archivo', cat: 'Formularios', w: 'fill', h: 120,
    props: { text: 'Toca para subir una foto', sub: 'JPG o PNG, máx. 10 MB' }, fields: [F.text('Texto'), F.text('Ayuda', 'sub')],
    render: (p) => <div className="wf-upload"><Icon name="upload" size={26} /><b>{p.text}</b><small>{p.sub}</small></div>,
  },
  {
    type: 'swatches', label: 'Selector de color', cat: 'Formularios', w: 'fill', h: 40,
    props: { active: 0 }, fields: [F.range('active', 'Elegido', 0, 5)],
    render: (p) => (
      <div className="wf-swatches">
        {['#17171d', '#c9c9d0', '#3b6cf6', '#16a37f', '#e0453a', '#c99a06'].map((c, i) => <i key={c} className={i === Number(p.active) ? 'on' : ''} style={{ background: c }} />)}
      </div>
    ),
  },
  {
    type: 'sizes', label: 'Selector de talla', cat: 'Formularios', w: 'fill', h: 44,
    props: { items: 'XS, S, M, L, XL', active: 2 }, fields: [F.items('Tallas'), F.range('active', 'Elegida', 0, 7)],
    render: (p) => <div className="wf-sizes">{items(p.items).map((x, i) => <span key={i} className={i === Number(p.active) ? 'on' : ''}>{x}</span>)}</div>,
  },
  {
    type: 'radiogroup', label: 'Opciones en tarjetas', cat: 'Formularios', w: 'fill', h: 176,
    props: { items: 'Envío estándar, Envío exprés, Recoger en tienda', active: 0 }, fields: [F.items('Opciones'), F.range('active', 'Elegida', 0, 5)],
    render: (p) => (
      <div className="wf-radiogroup">
        {items(p.items).map((x, i) => <div key={i} className={i === Number(p.active) ? 'on' : ''}><i />{x}</div>)}
      </div>
    ),
  },
  {
    type: 'checklist', label: 'Lista de tareas', cat: 'Formularios', w: 'fill', h: 150,
    props: { items: 'Reservar vuelo, Comprar adaptador, Imprimir billetes, Hacer la maleta', done: 2 }, fields: [F.items('Tareas'), F.range('done', 'Hechas', 0, 8)],
    render: (p) => (
      <div className="wf-checklist">
        {items(p.items).map((x, i) => (
          <div key={i} className={'wf-check' + (i < Number(p.done) ? ' done' : '')}>
            <i className={i < Number(p.done) ? 'on' : ''}>{i < Number(p.done) ? <Icon name="check" size={14} stroke={3} /> : null}</i>{x}
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'pricerange', label: 'Rango de precio', cat: 'Formularios', w: 'fill', h: 52,
    props: { min: 20, max: 70, text: '$20 – $70' }, fields: [F.range('min', 'Mínimo'), F.range('max', 'Máximo'), F.text('Texto')],
    render: (p) => (
      <div className="wf-range">
        <small>{p.text}</small>
        <div className="wf-slider"><i style={{ left: `${p.min}%`, width: `${Math.max(0, p.max - p.min)}%` }} /><b style={{ left: `${p.min}%` }} /><b style={{ left: `${p.max}%` }} /></div>
      </div>
    ),
  },
  {
    type: 'chatinput', label: 'Barra de mensaje', cat: 'Formularios', w: 'full', h: 64, dock: 'bottom',
    props: { text: 'Escribe un mensaje…' }, fields: [F.text('Texto de ejemplo')],
    render: (p) => (
      <div className="wf-chatinput">
        <Icon name="plus" size={22} />
        <span className="box">{p.text}</span>
        <span className="send"><Icon name="send" size={18} /></span>
      </div>
    ),
  },

  // ---------- Contenido (más) ----------
  {
    type: 'statsrow', label: 'Fila de métricas', cat: 'Contenido', w: 'fill', h: 64,
    props: { items: '128 Publicaciones, 4.2k Seguidores, 312 Siguiendo' }, fields: [F.items('Métricas (número y texto)')],
    render: (p) => (
      <div className="wf-statsrow">
        {items(p.items).map((x, i) => {
          const [n, ...r] = x.split(' ')
          return <div key={i}><b>{n}</b><small>{r.join(' ')}</small></div>
        })}
      </div>
    ),
  },
  {
    type: 'event', label: 'Evento', cat: 'Contenido', w: 'fill', h: 88,
    props: { day: '21', month: 'OCT', text: 'Concierto en el parque', sub: '19:30 · Parque Central' }, fields: [F.text('Día', 'day'), F.text('Mes', 'month'), F.text('Título'), F.text('Detalle', 'sub')],
    render: (p) => (
      <div className="wf-event">
        <div className="date"><b>{p.day}</b><small>{p.month}</small></div>
        <div className="txt"><b>{p.text}</b><span>{p.sub}</span></div>
        <Icon name="chevron" size={18} />
      </div>
    ),
  },
  {
    type: 'timeline', label: 'Seguimiento', cat: 'Contenido', w: 'fill', h: 220,
    props: { items: 'Pedido confirmado, Preparando, En camino, Entregado', active: 2 }, fields: [F.items('Etapas'), F.range('active', 'Actual', 0, 6)],
    render: (p) => (
      <div className="wf-timeline">
        {items(p.items).map((x, i) => (
          <div key={i} className={i < Number(p.active) ? 'done' : i === Number(p.active) ? 'now' : ''}>
            <i /><span><b>{x}</b><small>{i <= Number(p.active) ? `10:${String(12 + i * 9).padStart(2, '0')}` : '—'}</small></span>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: 'donut', label: 'Gráfica circular', cat: 'Contenido', w: 160, h: 160,
    props: { value: 68, text: 'Ahorro' }, fields: [F.range('value', 'Porcentaje'), F.text('Texto')],
    render: (p) => <Ring value={Number(p.value)} text={p.text} thick={22} />,
  },
  {
    type: 'ring', label: 'Anillo de progreso', cat: 'Contenido', w: 96, h: 96,
    props: { value: 75, text: '' }, fields: [F.range('value', 'Porcentaje'), F.text('Texto')],
    render: (p) => <Ring value={Number(p.value)} text={p.text} thick={10} />,
  },
  {
    type: 'onboarding', label: 'Bienvenida', cat: 'Contenido', w: 'fill', h: 340,
    props: { text: 'Todo en un solo lugar', sub: 'Organiza, comparte y recibe avisos sin complicaciones.' }, fields: [F.text('Título'), F.area('Texto', 'sub')],
    render: (p) => (
      <div className="wf-onb">
        <div className="art"><Ph /></div>
        <b>{p.text}</b>
        <p>{p.sub}</p>
      </div>
    ),
  },
  {
    type: 'player', label: 'Reproductor', cat: 'Contenido', w: 'fill', h: 150,
    props: { text: 'Nombre de la canción', sub: 'Artista' }, fields: [F.text('Título'), F.text('Artista', 'sub')],
    render: (p) => (
      <div className="wf-player">
        <div className="top"><div className="cover"><Ph /></div><div className="txt"><b>{p.text}</b><small>{p.sub}</small></div><Icon name="heart" size={20} /></div>
        <div className="wf-progress"><i style={{ width: '38%' }} /></div>
        <div className="ctrl"><Icon name="backward" size={18} /><Icon name="skip" size={20} style={{ transform: 'scaleX(-1)' }} /><span className="pp"><Icon name="pause" size={20} /></span><Icon name="skip" size={20} /><Icon name="refresh" size={18} /></div>
      </div>
    ),
  },
  {
    type: 'weekstrip', label: 'Tira de semana', cat: 'Contenido', w: 'fill', h: 64,
    props: { active: 2 }, fields: [F.range('active', 'Día elegido', 0, 6)],
    render: (p) => (
      <div className="wf-week">
        {t('LMXJVSD').split('').map((d, i) => <div key={i} className={i === Number(p.active) ? 'on' : ''}><small>{d}</small><b>{19 + i}</b></div>)}
      </div>
    ),
  },
  {
    type: 'review', label: 'Reseña', cat: 'Contenido', w: 'fill', h: 112,
    props: { text: 'Laura M.', value: 5, sub: 'Rápido, amable y todo llegó perfecto. Volveré a pedir.' }, fields: [F.text('Nombre'), F.range('value', 'Estrellas', 0, 5), F.area('Texto', 'sub')],
    render: (p) => (
      <div className="wf-review">
        <div className="head"><span className="wf-avatar sm">{initials(p.text)}</span><b>{p.text}</b><span className="wf-rating">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < Number(p.value) ? 'on' : ''}><Icon name="star" size={14} /></span>)}</span></div>
        <p>{p.sub}</p>
      </div>
    ),
  },

  // ---------- Comercio ----------
  {
    type: 'product', label: 'Producto', cat: 'Comercio', w: 171, h: 250,
    props: { text: 'Zapatillas', price: '$89', old: '$120' }, fields: [F.text('Nombre'), F.text('Precio', 'price'), F.text('Precio anterior', 'old')],
    render: (p) => (
      <div className="wf-product">
        <div className="img"><Ph /><span className="fav"><Icon name="heart" size={16} /></span></div>
        <b>{p.text}</b>
        <div className="price"><span>{p.price}</span>{p.old ? <s>{p.old}</s> : null}<span className="add"><Icon name="plus" size={16} /></span></div>
      </div>
    ),
  },
  {
    type: 'cartitem', label: 'Producto en carrito', cat: 'Comercio', w: 'full', h: 96,
    props: { text: 'Camiseta básica', sub: 'Talla M · Negro', price: '$25' }, fields: [F.text('Nombre'), F.text('Detalle', 'sub'), F.text('Precio', 'price')],
    render: (p) => (
      <div className="wf-cartitem">
        <div className="img"><Ph /></div>
        <div className="txt"><b>{p.text}</b><small>{p.sub}</small><span className="price">{p.price}</span></div>
        <div className="wf-counter"><Icon name="minus" size={16} /><b>1</b><Icon name="plus" size={16} /></div>
      </div>
    ),
  },
  {
    type: 'summary', label: 'Resumen de pedido', cat: 'Comercio', w: 'fill', h: 150,
    props: { items: 'Subtotal $240, Envío $10, Descuento -$20', total: '$230' }, fields: [F.items('Filas (texto y valor)'), F.text('Total', 'total')],
    render: (p) => (
      <div className="wf-summary">
        {items(p.items).map((x, i) => {
          const k = x.lastIndexOf(' ')
          return <div key={i}><span>{x.slice(0, k)}</span><span>{x.slice(k + 1)}</span></div>
        })}
        <div className="total"><b>Total</b><b>{p.total}</b></div>
      </div>
    ),
  },
  {
    type: 'ctabar', label: 'Barra de compra', cat: 'Comercio', w: 'full', h: 96, dock: 'bottom',
    props: { price: '$230', sub: 'Total', text: 'Pagar' }, fields: [F.text('Precio', 'price'), F.text('Detalle', 'sub'), F.text('Botón')],
    render: (p) => (
      <div className="wf-ctabar">
        <div><small>{p.sub}</small><b>{p.price}</b></div>
        <span className="wf-btn v-primary">{p.text}</span>
      </div>
    ),
  },
  {
    type: 'banner', label: 'Banner promocional', cat: 'Comercio', w: 'fill', h: 140,
    props: { text: '-30% esta semana', sub: 'En toda la colección de verano', cta: 'Ver ofertas' }, fields: [F.text('Título'), F.text('Texto', 'sub'), F.text('Botón', 'cta')],
    render: (p) => (
      <div className="wf-banner">
        <div className="txt"><b>{p.text}</b><small>{p.sub}</small><span className="cta">{p.cta}</span></div>
        <div className="img"><Ph /></div>
      </div>
    ),
  },
  {
    type: 'pricing', label: 'Plan de precios', cat: 'Comercio', w: 'fill', h: 270,
    props: { text: 'Pro', price: '$9', per: '/mes', items: 'Proyectos ilimitados, Exportar en PDF, Soporte prioritario', cta: 'Elegir plan' },
    fields: [F.text('Plan'), F.text('Precio', 'price'), F.text('Periodo', 'per'), F.items('Ventajas'), F.text('Botón', 'cta')],
    render: (p) => (
      <div className="wf-pricing">
        <small>{p.text}</small>
        <div className="amount"><b>{p.price}</b><span>{p.per}</span></div>
        {items(p.items).map((x, i) => <div key={i} className="feat"><Icon name="check" size={16} />{x}</div>)}
        <span className="wf-btn v-primary">{p.cta}</span>
      </div>
    ),
  },
  {
    type: 'ticket', label: 'Billete', cat: 'Comercio', w: 'fill', h: 180,
    props: { from: 'MEX', to: 'CDG', sub: '21 oct · 08:40 · Asiento 14A' }, fields: [F.text('Origen', 'from'), F.text('Destino', 'to'), F.text('Detalle', 'sub')],
    render: (p) => (
      <div className="wf-ticket">
        <div className="route"><b>{p.from}</b><Icon name="plane" size={22} /><b>{p.to}</b></div>
        <small>{p.sub}</small>
        <div className="cut" />
        <div className="barcode">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ width: (i * 7) % 3 + 1 }} />)}</div>
      </div>
    ),
  },
  {
    type: 'qr', label: 'Código QR', cat: 'Comercio', w: 150, h: 150,
    props: {}, fields: [],
    render: () => (
      <div className="wf-qr">
        <svg width="100%" height="100%" viewBox="0 0 21 21" shapeRendering="crispEdges">
          {Array.from({ length: 21 * 21 }).map((_, k) => {
            const x = k % 21, y = Math.floor(k / 21)
            const finder = (a: number, b: number) => x >= a && x < a + 7 && y >= b && y < b + 7
            const inF = finder(0, 0) || finder(14, 0) || finder(0, 14)
            let on: boolean
            if (inF) {
              const fx = x >= 14 ? x - 14 : x, fy = y >= 14 ? y - 14 : y
              on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
            } else on = ((x * 7 + y * 13 + x * y) % 5) < 2
            return on ? <rect key={k} x={x} y={y} width="1" height="1" /> : null
          })}
        </svg>
      </div>
    ),
  },

  // ---------- Social ----------
  {
    type: 'profile', label: 'Cabecera de perfil', cat: 'Social', w: 'fill', h: 230,
    props: { text: 'Laura Martín', sub: 'Fotógrafa · Lyon', items: '128 Fotos, 4.2k Seguidores, 312 Siguiendo' }, fields: [F.text('Nombre'), F.text('Bio', 'sub'), F.items('Métricas (número y texto)')],
    render: (p) => (
      <div className="wf-profile">
        <span className="wf-avatar" style={{ width: 84, height: 84, fontSize: 24 }}>{initials(p.text)}</span>
        <b>{p.text}</b>
        <small>{p.sub}</small>
        <div className="wf-statsrow">
          {items(p.items).map((x, i) => {
            const [n, ...r] = x.split(' ')
            return <div key={i}><b>{n}</b><small>{r.join(' ')}</small></div>
          })}
        </div>
      </div>
    ),
  },
  {
    type: 'stories', label: 'Historias', cat: 'Social', w: 'full', h: 96,
    props: { items: 'Tú, Ana, Luis, Marta, Pablo, Sofía' }, fields: [F.items('Nombres')],
    render: (p) => (
      <div className="wf-stories">
        {items(p.items).map((x, i) => <div key={i}><span className={'ring' + (i === 0 ? ' me' : '')}><span className="wf-avatar">{i === 0 ? <Icon name="plus" size={20} /> : initials(x)}</span></span><small>{x}</small></div>)}
      </div>
    ),
  },
  {
    type: 'post', label: 'Publicación', cat: 'Social', w: 'full', h: 470,
    props: { text: 'marta.viaja', sub: 'Atardecer en la costa, no hay nada igual.', likes: '1.204 Me gusta' }, fields: [F.text('Usuario'), F.text('Texto', 'sub'), F.text('Me gusta', 'likes')],
    render: (p) => (
      <div className="wf-post">
        <div className="head"><span className="wf-avatar sm">{initials(p.text)}</span><b>{p.text}</b><Icon name="more" size={20} style={{ marginLeft: 'auto' }} /></div>
        <div className="img"><Ph /></div>
        <div className="actions"><Icon name="heart" size={24} /><Icon name="chat" size={24} /><Icon name="send" size={24} /><Icon name="bookmark" size={24} style={{ marginLeft: 'auto' }} /></div>
        <b className="likes">{p.likes}</b>
        <p><b>{p.text}</b> {p.sub}</p>
      </div>
    ),
  },
  {
    type: 'commentitem', label: 'Comentario de usuario', cat: 'Social', w: 'fill', h: 72,
    props: { text: 'Pablo R.', sub: '¡Qué buena foto! ¿Dónde es?', time: '2 h' }, fields: [F.text('Nombre'), F.text('Texto', 'sub'), F.text('Tiempo', 'time')],
    render: (p) => (
      <div className="wf-commentitem">
        <span className="wf-avatar sm">{initials(p.text)}</span>
        <div className="txt"><span><b>{p.text}</b> {p.sub}</span><small>{p.time} · {t('Responder')}</small></div>
        <Icon name="heart" size={16} />
      </div>
    ),
  },
  {
    type: 'notification', label: 'Notificación', cat: 'Social', w: 'full', h: 80,
    props: { text: 'Nuevo pedido', sub: 'Tu pedido #2481 está en camino.', time: '5 min', icon: 'package', unread: true },
    fields: [F.text('Título'), F.text('Texto', 'sub'), F.text('Tiempo', 'time'), F.icon(), F.bool('unread', 'Sin leer')],
    render: (p) => (
      <div className={'wf-notif' + (p.unread ? ' unread' : '')}>
        <span className="ico"><Icon name={p.icon} size={20} /></span>
        <div className="txt"><b>{p.text}</b><span>{p.sub}</span></div>
        <small>{p.time}</small>
        {p.unread ? <i className="dot" /> : null}
      </div>
    ),
  },
  {
    type: 'videocall', label: 'Videollamada', cat: 'Social', w: 'full', h: 'full',
    props: { items: 'Ana, Luis, Marta, Tú' }, fields: [F.items('Participantes')],
    render: (p) => (
      <div className="wf-call">
        <div className="tiles">{items(p.items).slice(0, 4).map((x, i) => <div key={i}><span className="wf-avatar">{initials(x)}</span><small>{x}</small></div>)}</div>
        <div className="bar"><span><Icon name="mic" size={22} /></span><span><Icon name="video" size={22} /></span><span><Icon name="share" size={22} /></span><span className="end"><Icon name="call" size={22} /></span></div>
      </div>
    ),
  },

  // ---------- Avisos (más) ----------
  {
    type: 'menu', label: 'Menú contextual', cat: 'Avisos', w: 220, h: 196,
    props: { items: 'Editar, Duplicar, Compartir, Eliminar', icons: 'edit, copy, share, trash' }, fields: [F.items('Opciones'), { key: 'icons', label: 'Iconos', kind: 'icons' }],
    render: (p) => {
      const ics = items(p.icons)
      const its = items(p.items)
      return <div className="wf-menu">{its.map((x, i) => <div key={i} className={i === its.length - 1 ? 'danger' : ''}><Icon name={ics[i] || 'star'} size={18} />{x}</div>)}</div>
    },
  },
  {
    type: 'actionsheet', label: 'Hoja de acciones', cat: 'Avisos', w: 'full', h: 290, dock: 'bottom',
    props: { text: '¿Qué quieres hacer?', items: 'Tomar foto, Elegir de la galería, Eliminar foto', cancel: 'Cancelar' }, fields: [F.text('Título'), F.items('Acciones'), F.text('Cancelar', 'cancel')],
    render: (p) => {
      const its = items(p.items)
      return (
        <div className="wf-actionsheet">
          <div className="group"><small>{p.text}</small>{its.map((x, i) => <div key={i} className={i === its.length - 1 ? 'danger' : ''}>{x}</div>)}</div>
          <div className="group cancel"><div>{p.cancel}</div></div>
        </div>
      )
    },
  },
  {
    type: 'tooltip', label: 'Globo de ayuda', cat: 'Avisos', w: 220, h: 64,
    props: { text: 'Toca aquí para añadir tu primera tarea' }, fields: [F.text('Texto')],
    render: (p) => <div className="wf-tooltip"><span>{p.text}</span><i /></div>,
  },
  {
    type: 'permission', label: 'Solicitud de permiso', cat: 'Avisos', w: 290, h: 220,
    props: { text: '¿Permitir notificaciones?', sub: 'Te avisaremos cuando tu pedido esté en camino.', icon: 'bell' }, fields: [F.text('Título'), F.text('Texto', 'sub'), F.icon()],
    render: (p) => (
      <div className="wf-dialog center">
        <span className="ico"><Icon name={p.icon} size={26} /></span>
        <b>{p.text}</b>
        <p>{p.sub}</p>
        <div className="actions col"><span className="wf-btn v-primary">{t('Permitir')}</span><span className="wf-btn v-ghost">{t('Ahora no')}</span></div>
      </div>
    ),
  },

  // ---------- Formas ----------
  {
    type: 'rect', label: 'Rectángulo', cat: 'Formas', w: 160, h: 100,
    props: { fill: 'light', radius: 8, outline: true },
    fields: [F.select('fill', 'Relleno', [['none', 'Ninguno'], ['light', 'Claro'], ['mid', 'Medio'], ['dark', 'Oscuro']]), F.range('radius', 'Esquinas', 0, 60), F.bool('outline', 'Borde')],
    render: (p) => <div className={`wf-shape f-${p.fill}` + (p.outline ? ' outline' : '')} style={{ borderRadius: Number(p.radius) }} />,
  },
  {
    type: 'ellipse', label: 'Círculo', cat: 'Formas', w: 80, h: 80,
    props: { fill: 'light', outline: true },
    fields: [F.select('fill', 'Relleno', [['none', 'Ninguno'], ['light', 'Claro'], ['mid', 'Medio'], ['dark', 'Oscuro']]), F.bool('outline', 'Borde')],
    render: (p) => <div className={`wf-shape f-${p.fill}` + (p.outline ? ' outline' : '')} style={{ borderRadius: '50%' }} />,
  },
  {
    type: 'line', label: 'Línea', cat: 'Formas', w: 160, h: 12,
    props: { dashed: false }, fields: [F.bool('dashed', 'Discontinua')],
    render: (p) => <div className={'wf-line' + (p.dashed ? ' dashed' : '')}><i /></div>,
  },
  {
    type: 'arrow', label: 'Flecha', cat: 'Formas', w: 140, h: 24,
    props: { dir: 'right' }, fields: [F.select('dir', 'Dirección', [['right', 'Derecha'], ['left', 'Izquierda'], ['down', 'Abajo'], ['up', 'Arriba']])],
    render: (p) => (
      <div className="wf-arrow" style={{ transform: { right: 'none', left: 'scaleX(-1)', down: 'none', up: 'none' }[p.dir as string] }}>
        <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none">
          {p.dir === 'down' || p.dir === 'up' ? null : <path d="M2 12H96M84 3L96 12 84 21" fill="none" vectorEffect="non-scaling-stroke" />}
        </svg>
        {p.dir === 'down' || p.dir === 'up' ? (
          <svg width="100%" height="100%" viewBox="0 0 24 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, transform: p.dir === 'up' ? 'scaleY(-1)' : 'none' }}>
            <path d="M12 2V96M3 84L12 96 21 84" fill="none" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}
      </div>
    ),
  },
  {
    type: 'note', label: 'Nota', cat: 'Formas', w: 170, h: 130,
    props: { text: 'Aquí va el logo definitivo' }, fields: [F.area('Texto')],
    render: (p) => <div className="wf-note">{p.text}</div>,
  },
  {
    type: 'hotspot', label: 'Zona táctil', cat: 'Formas', w: 120, h: 60,
    props: {}, fields: [],
    render: () => <div className="wf-hotspot" />,
  },
]

function initials(s: string) {
  return String(s || '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Ring({ value, text, thick }: { value: number; text?: string; thick: number }) {
  const r = 50 - thick / 2
  const c = 2 * Math.PI * r
  return (
    <div className="wf-ring">
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} strokeWidth={thick} className="track" fill="none" />
        <circle cx="50" cy="50" r={r} strokeWidth={thick} fill="none" strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 50 50)" strokeLinecap="round" />
      </svg>
      <div className="lbl"><b>{value}%</b>{text ? <small>{text}</small> : null}</div>
    </div>
  )
}

function ListRow({ p }: { p: Record<string, any> }) {
  return (
    <div className={'wf-row' + (p.compact ? ' compact' : '')}>
      {p.lead === 'avatar' ? <span className="wf-avatar sm">{initials(p.text)}</span> : null}
      {p.lead === 'image' ? <span className="wf-row-img"><Ph /></span> : null}
      {p.lead === 'icon' ? <span className="wf-row-ico"><Icon name="star" size={18} /></span> : null}
      <div className="txt">
        <b>{p.text}</b>
        {p.sub ? <span>{p.sub}</span> : null}
      </div>
      {p.trail === 'chevron' ? <Icon name="chevron" size={18} /> : null}
      {p.trail === 'switch' ? <i className="wf-switch on" /> : null}
      {p.trail === 'badge' ? <span className="wf-badge">2</span> : null}
      {p.trail === 'text' ? <small>10:24</small> : null}
    </div>
  )
}

export const DEFS: Record<string, Def> = Object.fromEntries(LIBRARY.map((d) => [d.type, d]))
export const ICON_OPTIONS: [string, string][] = [['none', 'Ninguno'], ...ICON_NAMES.map((n) => [n, n] as [string, string])]

export function sizeFor(def: Def, sw: number, sh: number) {
  const w = def.w === 'full' ? sw : def.w === 'fill' ? sw - 32 : def.w
  const h = def.h === 'full' ? sh : def.h
  return { w, h }
}

// sample content in the current language, used when a component is inserted or previewed
export function localProps(props: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(props)) out[k] = typeof v === 'string' ? t(v) : v
  return out
}
