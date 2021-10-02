import { useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Heading, Text, VStack, HStack, Select, Input } from '@chakra-ui/react'
import Fuse from 'fuse.js'

import PageLayout from '../../components/PageLayout'
import ChakraTable from '../../components/ChakraTable'

import { getBooksFeed, getApiSignature } from '../../lib/api'

export default function BooksPage ({ books, apiSignature, loadedIndexes, addLoadedIndex }) {
  return (
    <>
      <Head>
        <title>Books</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Books Listing
          </Heading>
          <Text fontSize='2xl' mt='2'>
            List of Books
          </Text>
          <BookList books={books} />
        </VStack>
      </PageLayout>
    </>
  )
}

function safeDate (dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toISOString().substring(0, 10)
  } catch (err) {
    return ''
  }
}

function BookList ({ books }) {
  // make the fuse index, and memoize it
  const fuseIndex = useMemo(() => {
    const keys = [
      'title',
      'authorName',
      'bookDescription'
    ]
    return Fuse.createIndex(keys, books)
  }, [books])

  // the drop down items are inferred from the unfiltered books array
  const shelves = useMemo(() => {
    const shelves = new Set()
    books.forEach(b => {
      shelves.add(b.userShelves)
    })
    // prepend 'All'
    return ['All', ...Array.from(shelves)]
  }, [books])

  // state for search term
  const [searchTerm, setSearchTerm] = useState('')
  const onSearch = (event) => {
    // TODO: can we debounce this?
    setSearchTerm(event.target.value)
  }

  // default shelf is 'currently-reading' if present, else shelves[0]=='All'
  const [shelf, setShelf] = useState(shelves.includes('currently-reading') ? 'currently-reading' : shelves[0])
  const onShelfChange = (event) => {
    setShelf(event.target.value)
  }

  // Filtering is applied in order:
  // - Search filtering if we have a search term
  // - Shelf filtering
  const data = useMemo(
    () => {
      // reload the memoized index
      const fuse = new Fuse(books, { includeScore: true }, fuseIndex)
      const maxSearchResults = 20 // this just speed up the re-rendering of results
      const searchFiltered = searchTerm // if there is a search term, filter the books
        ? fuse.search(searchTerm, { limit: maxSearchResults }).map(({ item }) => item) // .slice(0, 10)
        : books

      const shelfFiltered = (shelf === 'All')
        ? searchFiltered
        : searchFiltered.filter((b) => b?.userShelves === shelf)

      // Finally, make the dates safe
      return shelfFiltered
        .map((b) => ({ ...b, userReadAt: safeDate(b?.userReadAt) }))
    },
    [books, shelf, searchTerm]
  )

  const columns = useMemo(
    () => [{
      Header: 'Title',
      accessor: 'title',
      Cell: ({ value, row: { original: { bookId } } }) => {
        return <Link href={`/books/${bookId}`}><a>{value}</a></Link>
      }
    }, {
      Header: 'Author',
      accessor: 'authorName'
    }, {
      Header: 'Shelf',
      accessor: 'userShelves'
    }, {
      Header: 'Read',
      accessor: 'userReadAt'
    }
    ],
    []
  )
  return (
    <>
      <HStack>
        <Input placeholder='Search..' onChange={onSearch} />
        <Select value={shelf} onChange={onShelfChange}>
          {shelves.map((shelf) => (
            <option key={shelf} value={shelf}>{shelf}</option>
          ))}
        </Select>
      </HStack>
      <ChakraTable columns={columns} data={data} />
    </>
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const booksFeed = await getBooksFeed()
  return {
    props: { books: booksFeed.items, apiSignature }, // will be passed to the page component as props
    revalidate: 600 // will cause the page to revalidate every 10 minutes
  }
}
