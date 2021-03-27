import Head from 'next/head'
import { Heading, Text, Box, Flex, VStack,Code } from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'
import { getBooksFeed,getBook, getApiSignature } from '../../lib/api'

export default function BookPage ({ book, apiSignature , loadedIndexes, addLoadedIndex }) {
  const {title,authorName,bookDescription} = book
  return (
    <>
      <Head>
        <title>Book - {title}</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
      <VStack as='main' my='2rem' mx={2} maxWidth='60rem'>
        <Heading as='h1' size='xl' mb='2'>{title}</Heading>
        <Heading as='h2' size='lg' mb='2'>by {authorName}</Heading>
        <Text fontSize='md' mt='2'>{bookDescription}</Text>
      </VStack>
      </PageLayout>
    </>
  )
}


export async function getStaticProps ({params}) {
  const apiSignature = await getApiSignature()
  const {bookId } = params
  const book = await getBook(bookId)
  return {
    props: { apiSignature,book } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths() {
  const booksFeed = await getBooksFeed()
  const books = booksFeed.items
  console.log('books paths:',books.length)
  return {
    paths: books.map(({bookId}) => {
      return {
        params: {
          bookId,
        },
      }
    }),
    fallback: false,
  }
}
