import { useMemo } from 'react'
import Head from 'next/head'
import { Heading, Text, VStack } from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'
import ChakraTable from '../../components/ChakraTable'
import { getPodcasts, getApiSignature } from '../../lib/api'

export default function PodcastsPage ({ podcasts, apiSignature, loadedIndexes, addLoadedIndex }) {
  return (
    <>
      <Head>
        <title>Podcasts</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Podcast Listing
          </Heading>
          <Text fontSize='2xl' mt='2'>
            This is a list of my subscribed podcasts
          </Text>
          <PodcastList podcasts={podcasts} />
        </VStack>
      </PageLayout>

    </>
  )
}

function PodcastList ({ podcasts }) {
  const data = useMemo(
    () => podcasts
      // .filter((b) => b?.userShelves !== 'to-read')
      .map((b) => ({
        ...b,
        updatedAt: b?.meta?.__lastUpdated,
        firstSeenAt: b?.meta?.__firstSeen
      })),
    []
  )

  const columns = useMemo(
    () => [{
      Header: 'Title',
      accessor: 'title'
    }, {
      Header: 'Author',
      accessor: 'author'
    }, {
      Header: 'Since',
      accessor: 'firstSeenAt'
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
  const podcasts = await getPodcasts()
  return {
    props: { podcasts, apiSignature } // will be passed to the page component as props
    // revalidate: 0,
  }
}
