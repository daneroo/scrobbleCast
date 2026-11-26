import { Link } from '@tanstack/react-router'
import type { Book } from '../data/books'
import { shortLines } from '../list/shown'
import type { ShownField } from '../list/shown'
import type { CardSize } from '../list/view'
import { Progress, classes } from '../ui'
import { progress } from './list'
import { ShelfBadge, Stars } from './ui'

// The feed's covers are small (`._SY75_`); the same URL gives other heights:
// `SY300` is 199×300. With no suffix, the URL is the 315×475 original.
function coverUrl(book: Book, size: 'SY75' | 'SY300') {
  return book.bookImageURL.replace(/\._S[XY]\d+_\./, `._${size}_.`)
}

// Each size's pixels, so the browser keeps the room before it loads (the CSS
// sets the width; the 2:3 ratio gives the height).
const sizes = { SY75: { width: 50, height: 75 }, SY300: { width: 199, height: 300 } } as const

// `lift`: a deeper shadow while its card is hovered. `className` is for
// layout only, as in ui.tsx.
export function Cover({ book, size = 'SY300', lift = false, className }: { book: Book; size?: 'SY75' | 'SY300'; lift?: boolean; className?: string }) {
  return (
    <img
      src={coverUrl(book, size)}
      alt=""
      width={sizes[size].width}
      height={sizes[size].height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={classes('aspect-2/3 rounded-sm bg-artwork object-cover shadow-sm', lift && 'transition group-hover:shadow-card', className)}
    />
  )
}

// What the large card always shows, so not as one of its two short lines.
const largeOwn = new Set(['author', 'rating', 'avg', 'shelf', 'progress'])

// A book as a card, a link to its page. Small: cover, title, and up to two
// short lines from the fields shown. Large: a big cover with a progress bar
// over it while reading; title; author; stars (or progress while reading)
// and the average; the shelf; and two more short lines.
export function BookCard({ book, size, fields }: { book: Book; size: CardSize; fields: readonly ShownField<Book>[] }) {
  const link = { to: '/books/$bookId', params: { bookId: book.bookId } } as const

  if (size === 'small') {
    return (
      <Link {...link} className="group grid grid-cols-1 gap-1.5 text-inherit no-underline">
        <Cover book={book} className="w-full" />
        <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline">{book.title}</span>
        <span className="grid gap-0.5 text-xs text-muted-foreground">
          {shortLines(book, fields, 2).map(([key, line]) => <span key={key} className="block truncate">{line}</span>)}
        </span>
      </Link>
    )
  }

  const reading = book.userShelf === 'currently-reading'
  const percent = progress(book)
  const rest = shortLines(book, fields.filter(({ key }) => !largeOwn.has(key)), 2)
  return (
    <Link {...link} className="group grid grid-cols-1 gap-2 text-inherit no-underline">
      <span className="relative">
        <Cover book={book} lift className="w-full" />
        {reading && percent !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-b-sm bg-card/70">
            <span className="block h-full bg-primary" style={{ width: `${Math.min(percent, 100)}%` }} />
          </span>
        )}
      </span>
      <span className="line-clamp-2 leading-snug font-semibold group-hover:underline">{book.title}</span>
      <span className="-mt-1.5 truncate text-sm text-muted-foreground">{book.authorName}</span>
      <span className="flex items-center justify-between gap-2 text-sm">
        {reading ? <Progress value={percent} /> : <Stars value={book.userRating} />}
        <span className="text-muted-foreground tabular-nums">avg {book.averageRating}</span>
      </span>
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <ShelfBadge shelf={book.userShelf} />
        <span className="min-w-0 truncate tabular-nums">
          {rest.map(([key, line], index) => <span key={key}>{index > 0 && ' · '}{line}</span>)}
        </span>
      </span>
    </Link>
  )
}
