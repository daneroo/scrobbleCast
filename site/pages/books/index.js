import { useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Heading, Text, VStack } from '@chakra-ui/react'

import PageLayout from '../../components/PageLayout'
import ChakraTable from '../../components/ChakraTable'

import { getBooksFeed, getApiSignature } from '../../lib/api'

export default function PodcastsPage ({ books, apiSignature, loadedIndexes, addLoadedIndex }) {
  // console.log({ books })
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
  const data = useMemo(
    () => books
      .filter((b) => b?.userShelves !== 'to-read')
      .map((b) => ({ ...b, userReadAt: safeDate(b?.userReadAt) })),
    []
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
      Header: 'Read',
      accessor: 'userReadAt'
    }
    ],
    []
  )
  return (
    <ChakraTable columns={columns} data={data} />
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const booksFeed = await getBooksFeed()
  return {
    props: { books: booksFeed.items, apiSignature } // will be passed to the page component as props
    // revalidate: 0,
  }
}
