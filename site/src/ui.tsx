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
  feed, count,
}: { feed: Promise<Feed<T>>; count: (data: T) => number }) {
  return (
    <Await promise={feed} fallback={<Loading />}>
      {({ data }) => count(data).toLocaleString()}
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

// The look of a text input.
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

// A short label in a pill: a book's shelf, an episode's status.
export function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{children}</span>
}

// A percentage as a bar and its number; a dash for none.
export function Progress({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-table-stripe ring-1 ring-border">
        <span className="block h-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(value)}%</span>
    </span>
  )
}
