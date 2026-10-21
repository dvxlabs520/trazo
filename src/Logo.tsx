// Brand mark: two overlapping squares (shared work), plus the wordmark.
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="232 232 560 560" aria-hidden="true">
        <rect x="232" y="232" width="372" height="372" rx="92" fill="#fff" />
        <rect x="420" y="420" width="372" height="372" rx="92" fill="#3b6cf6" />
        <path d="M512 420H604V512A92 92 0 01512 604H420V512A92 92 0 01512 420Z" fill="#a9c0ff" />
      </svg>
      <span>Trazo</span>
    </span>
  )
}
