import Head from 'next/head'
import { Heading, Text, Box, Flex, VStack } from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'

import { getBooksFeed, getApiSignature } from '../../lib/api'

export default function PodcastsPage ({ books, apiSignature, loadedIndexes, addLoadedIndex }) {
  // console.log({ books })
  return (
    <>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <Head>
          <title>Books</title>
        </Head>
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Books Listing
          </Heading>
          <Text fontSize='2xl' mt='2'>
            List of Books
          </Text>
          {books.length > 0 && <Books books={books} />}
        </VStack>
      </PageLayout>
    </>
  )
}

function Books ({ books }) {
  return (
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      {books.map(({ bookId, title, authorName, bookDescription }) => (
        <Card key={bookId} href={`/books/${bookId}`}>
          <Heading as='h4' size='md'>{bookId} {title}  {authorName}</Heading>
          {/* <Text fontSize='lg'>{bookDescription}</Text> */}
        </Card>
      ))}
    </Flex>
  )
}
function Card (props) {
  return (
    <Box
      as='a'
      p='1' m='1'
      borderWidth='1px'
      rounded='lg'
      // flexBasis={['auto', '45%']}
      {...props}
    />

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
