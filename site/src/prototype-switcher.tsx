// PROTOTYPE (branch prototype/layout, never merges): the floating bar that
// cycles a page's `?variant=` with ←/→. Shown in dev builds only.
import { useEffect } from 'react'

export interface Variant {
  key: string
  name: string
}

export function PrototypeSwitcher({
  variants, current, onChange,
}: { variants: Variant[]; current: string; onChange: (key: string) => void }) {
  const index = Math.max(0, variants.findIndex(({ key }) => key === current))
  const step = (by: number) => onChange(variants[(index + by + variants.length) % variants.length].key)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!import.meta.env.DEV) return null
  const { key, name } = variants[index]
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-1.5 py-1 text-sm text-background shadow-2xl ring-2 ring-primary">
      <button type="button" aria-label="Previous variant" className="grid size-9 place-items-center rounded-full hover:bg-background/20" onClick={() => step(-1)}>←</button>
      <span className="px-2 whitespace-nowrap"><strong>{key}</strong> · {name} <span className="opacity-60">({index + 1}/{variants.length})</span></span>
      <button type="button" aria-label="Next variant" className="grid size-9 place-items-center rounded-full hover:bg-background/20" onClick={() => step(1)}>→</button>
    </div>
  )
}
