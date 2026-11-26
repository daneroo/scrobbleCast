import { Await, Link, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { documentTitle } from './format'
import { Loading } from './ui'

// What the detail pages (a book, a podcast, an episode) share.

// The data part of a detail page: the record once it has loaded, or not found.
export function Found<T>({ record, children }: { record: Promise<T | undefined>; children: (record: T) => ReactNode }) {
  return (
    <Await promise={record} fallback={<Loading block />}>
      {(found) => {
        if (found === undefined) throw notFound()
        return children(found)
      }}
    </Await>
  )
}

// The route's head gives a detail page a generic title until its record loads.
export function usePageTitle(title: string) {
  useEffect(() => { document.title = documentTitle(title) }, [title])
}

// A record's page, with a link back to its list.
export function DetailPage({ back, label, children }: { back: '/books' | '/podcasts' | '/episodes'; label: string; children: ReactNode }) {
  return (
    <article className="max-w-4xl">
      <Link className="mb-6 inline-block" to={back}>← {label}</Link>
      {children}
    </article>
  )
}

// A detail page's parts: the artwork beside the title, then under the title
// the author or podcast, a line of metadata, and the description below.
export const detailHeading = 'flex items-start gap-4 sm:gap-8'
export const byline = 'mt-3 text-xl text-accent'
export const metadata = 'mt-2 mb-4 text-muted-foreground'
export const description = 'mt-7 max-w-[72ch] leading-relaxed whitespace-pre-line'
// The artwork's width beside the title.
export const detailArtwork = 'w-16 sm:w-24 md:w-28'

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{children}</dd>
    </div>
  )
}
