import { Link } from '@tanstack/react-router'
import type { Book } from '../data/books'
import type { PageDefinition } from '../list/page'
import type { ShownField } from '../list/shown'
import { BookCard, Cover } from './card'
import { booksList } from './list'
import { BookPanel } from './panel'
import { bookPresets } from './presets'

// The books list's page: its registry and presets on the shared list page.
export const booksPage: PageDefinition<Book, ShownField<Book>> = {
  name: 'books',
  title: 'Books',
  noun: ['book', 'books'],
  placeholder: 'shelf:on-deck pages:<300 sort:-avg   — or just words',
  list: booksList,
  presets: bookPresets,
  id: (book) => book.bookId,
  // Cover, title and author.
  lead: {
    label: 'Book',
    cell: (book) => (
      <span className="flex items-start gap-3">
        <Cover book={book} size="SY75" className="w-9 shrink-0" />
        <span className="grid">
          <Link to="/books/$bookId" params={{ bookId: book.bookId }} className="font-semibold">{book.title}</Link>
          <span className="text-sm text-muted-foreground">{book.authorName}</span>
        </span>
      </span>
    ),
  },
  expand: {
    panel: (book) => <BookPanel book={book} />,
    label: (book) => `Details for ${book.title}`,
  },
  // A lane's card is small, with at most two short lines and, as in the
  // prototype's lanes, never the shelf's.
  card: (book, fields, size) => size === 'lane'
    ? <BookCard book={book} size="small" fields={fields.filter(({ key }) => key !== 'shelf')} />
    : <BookCard book={book} size={size} fields={fields} />,
}
