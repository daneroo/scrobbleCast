import { shelfName } from '../data/books'
import type { Book } from '../data/books'
import { DetailPage, Found, byline, description, detailArtwork, detailHeading, metadata, usePageTitle } from '../detail'
import { day } from '../format'
import { Artwork, Heading } from '../ui'

export function BookDetail({ book }: { book: Promise<Book | undefined> }) {
  return (
    <DetailPage back="/books" label="Books">
      <Found record={book}>{(book) => <BookInfo book={book} />}</Found>
    </DetailPage>
  )
}

function BookInfo({ book }: { book: Book }) {
  usePageTitle(book.title)
  return (
    <>
      <div className={detailHeading}>
        <Artwork src={book.bookImageURL} ratio="2/3" className={detailArtwork} />
        <div>
          <Heading>{book.title}</Heading>
          <p className={byline}>{book.authorName}</p>
          <p className={metadata}>{shelfName(book.userShelf)}{book.userLastReadAt && ` · Last read ${day(book.userLastReadAt)}`}</p>
          <a href={book.bookURL}>View on Goodreads <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      {book.bookDescription && <p className={description}>{book.bookDescription}</p>}
    </>
  )
}
