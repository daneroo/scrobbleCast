import { Await } from '@tanstack/react-router'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type { Feed } from './data/fetch'

// Small building blocks shared by the pages; their look comes from roles only.
//
// `className` on these components is additive, for layout only (margins,
// width, placement): it is appended to the built-in classes, never merged,
// so a class that conflicts with a built-in one (padding, colour, size) wins
// or loses by Tailwind's CSS order, not by being passed. A page that needs a
// different built-in style should get a prop for it instead.

export function classes(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ')
}

// A page's main heading.
export function Heading({ className, ...props }: ComponentProps<'h1'>) {
  return (
    <h1
      className={classes('text-4xl font-bold tracking-tighter wrap-anywhere lg:text-5xl', className)}
      {...props}
    />
  )
}

// A raised box on the page: empty results, errors, loading.
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={classes('rounded-lg border bg-card p-6', className)} {...props} />
}

// Pages show their static part at once. Each data part waits for its feed in
// `<Await>`, showing a small placeholder until then.
export function Loading({ block = false }: { block?: boolean }) {
  return block
    ? <Panel role="status">Loading…</Panel>
    : <span className="animate-pulse text-muted-foreground motion-reduce:animate-none" role="status" aria-label="Loading">…</span>
}

// A count from a feed, once the feed has loaded.
export function FeedCount<T>({
  feed, count, unit,
}: { feed: Promise<Feed<T>>; count: (data: T) => number; unit?: [one: string, many: string] }) {
  return (
    <Await promise={feed} fallback={<Loading />}>
      {({ data }) => {
        const n = count(data)
        return unit ? `${n.toLocaleString()} ${n === 1 ? unit[0] : unit[1]}` : n.toLocaleString()
      }}
    </Await>
  )
}

// The primary action.
export function Button({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={classes(
        'rounded-md border border-primary bg-primary px-3.5 py-2 text-primary-foreground hover:bg-primary-hover',
        className,
      )}
      {...props}
    />
  )
}

// A labelled form control: the label above, the control below.
export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={classes('grid gap-1.5 text-sm font-semibold', className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

// The look of a text input or select inside a Field.
export const control = 'min-h-11 w-full rounded-md border border-input bg-field px-3 py-2 font-normal'

// A record's artwork: a square image (`ratio="2/3"` for a book cover), or
// the app icon when there is none or it fails to load. `className` sets its
// width.
export function Artwork({ src, ratio = 'square', className }: { src: string | undefined; ratio?: 'square' | '2/3'; className?: string }) {
  return (
    <span
      className={classes(
        'grid shrink-0 place-items-center overflow-hidden rounded-md bg-artwork',
        ratio === 'square' ? 'aspect-square' : 'aspect-2/3',
        className,
      )}
    >
      {/* Keyed, so every new `src` (even one that failed before) gets a fresh try. */}
      {src ? <ArtworkImage key={src} src={src} /> : <AppIcon />}
    </span>
  )
}

// One image, or the app icon once it fails to load.
function ArtworkImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <AppIcon />
  return <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-full object-contain" onError={() => setFailed(true)} />
}

function AppIcon() {
  return <img src="/scrobble-cast.svg" alt="" className="w-[70%]" />
}
