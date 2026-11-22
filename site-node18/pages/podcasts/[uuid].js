import Head from 'next/head'
import { Heading, Text, VStack } from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'
import { getPodcast, getPodcasts, getApiSignature } from '../../lib/api'

export default function PodcastPage ({ podcast, apiSignature, loadedIndexes, addLoadedIndex }) {
  const { title, author, description } = podcast
  return (
    <>
      <Head>
        <title>Podcast - {title}</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <VStack as='main' my='2rem' mx={2} maxWidth='60rem'>
          <Heading as='h1' size='xl' mb='2'>{title}</Heading>
          <Heading as='h2' size='lg' mb='2'>by {author}</Heading>
          <Text fontSize='md' mt='2'>{description}</Text>
        </VStack>
      </PageLayout>
    </>
  )
}

export async function getStaticProps ({ params }) {
  const { uuid } = params
  const apiSignature = await getApiSignature()
  const podcast = await getPodcast(uuid)
  return {
    props: { apiSignature, podcast } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths () {
  const podcasts = await getPodcasts()
  return {
    paths: podcasts.map(({ uuid }) => {
      return {
        params: {
          uuid
        }
      }
    }),
    fallback: false
  }
}
