import { useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Heading, Text, VStack, HStack, Input } from '@chakra-ui/react'
import Fuse from 'fuse.js'

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
  // make the fuse index, and memoize it
  const fuseIndex = useMemo(() => {
    const keys = [
      'title',
      'author',
      'description'
    ]
    return Fuse.createIndex(keys, podcasts)
  }, [podcasts])

  // state for search term
  const [searchTerm, setSearchTerm] = useState('')
  const onSearch = (event) => {
    // TODO: can we debounce this?
    setSearchTerm(event.target.value)
  }
  const data = useMemo(
    () => {
      // reload the memoized index
      const fuse = new Fuse(podcasts, { includeScore: true }, fuseIndex)
      const maxSearchResults = 20 // this just speed up the re-rendering of results
      const searchFiltered = searchTerm // if there is a search term, filter the books
        ? fuse.search(searchTerm, { limit: maxSearchResults }).map(({ item }) => item) // .slice(0, 10)
        : podcasts

      return searchFiltered.map((b) => ({
        ...b,
        updatedAt: b?.meta?.__lastUpdated,
        firstSeenAt: b?.meta?.__firstSeen
      }))
    },
    [podcasts, searchTerm]
  )

  const columns = useMemo(
    () => [{
      Header: 'Title',
      accessor: 'title',
      Cell: ({ value, row: { original: { uuid } } }) => {
        return <Link href={`/podcasts/${uuid}`}><a>{value}</a></Link>
      }
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
    <>
      <HStack>
        <Input placeholder='Search..' onChange={onSearch} />
      </HStack>
      <ChakraTable columns={columns} data={data} />
    </>
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const podcasts = await getPodcasts()
  return {
    props: { podcasts, apiSignature }, // will be passed to the page component as props
    revalidate: 600 // will cause the page to revalidate every 10 minutes
  }
}
