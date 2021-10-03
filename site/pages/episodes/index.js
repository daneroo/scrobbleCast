import { useState, useMemo } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import {
  Heading, Text, Flex, VStack, HStack, Input, Button, Checkbox
} from '@chakra-ui/react'
import Fuse from 'fuse.js'

import PageLayout from '../../components/PageLayout'
import ChakraTable from '../../components/ChakraTable'

// import { fromNow, humanDuration } from '../../lib/date.js'
import { getDecoratedEpisodes, getApiSignature } from '../../lib/api'

export default function EpisodesPage ({ episodes, apiSignature, loadedIndexes, addLoadedIndex }) {
  return (
    <>
      <Head>
        <title>Episodes</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Episode Listing
          </Heading>
          <Text fontSize='2xl' mt='2'>
            Recently listened episodes
          </Text>
          <EpisodeList episodes={episodes} />
        </VStack>
      </PageLayout>
    </>
  )
}

function asPercentage (playedProportion) {
  return `${(playedProportion * 100).toFixed(2)}%`
}

function EpisodeList ({ episodes }) {
  // make the fuse index, and memoize it
  const fuseIndex = useMemo(() => {
    const keys = [
      'title',
      'podcast.title'
      // 'showNotes'
    ]
    return Fuse.createIndex(keys, episodes)
  }, [episodes])

  // state for search term
  const [searchTerm, setSearchTerm] = useState('')
  const onSearch = (event) => {
    // TODO: can we debounce this?
    setSearchTerm(event.target.value)
  }

  const [onlyPlayed, setOnlyPlayed] = useState(true)
  const onPlayedOnly = (event) => {
    setOnlyPlayed(event.target.checked)
  }

  const filtered = useMemo(
    () => {
      // reload the memoized index
      const fuse = new Fuse(episodes, { includeScore: true }, fuseIndex)
      const maxSearchResults = 20 // this just speed up the re-rendering of results
      const searchFiltered = searchTerm // if there is a search term, filter the books
        ? fuse.search(searchTerm, { limit: maxSearchResults }).map(({ item }) => item) // .slice(0, 10)
        : episodes

      // filter for played>0
      const playFiltered = onlyPlayed
        ? searchFiltered.filter((e) => e.playedTime > 0)
        : searchFiltered
      return playFiltered
    },
    [episodes, searchTerm, onlyPlayed]
  )

  // Shortened episode list
  const [sliceLimit, setSliceLimit] = useState(5)
  const moreAvailable = (sliceLimit < filtered.length)
  function showMore () {
    setSliceLimit(Math.min(sliceLimit + 20, filtered.length))
  }

  const data = useMemo(
    () => {
      return filtered
        .slice(0, sliceLimit)
        .map((b) => ({
          ...b,
          percentPlayed: asPercentage(b?.playedProportion),
          podcastTitle: b?.podcast?.title,
          updatedAt: b?.meta?.__lastUpdated,
          firstSeenAt: b?.meta?.__firstSeen,
          lasPlayedAt: b?.meta?.__lastPlayed
        }))
    },
    [filtered, searchTerm, sliceLimit]
  )

  const columns = useMemo(
    () => [{
      Header: 'Title',
      accessor: 'title',
      Cell: ({ value, row: { original: { uuid } } }) => {
        return <Link href={`/episodes/${uuid}`}><a>{value}</a></Link>
      }
    }, {
      Header: 'Podcast',
      accessor: 'podcastTitle',
      // eslint-disable-next-line camelcase
      Cell: ({ value, row: { original: { podcast_uuid } } }) => <Link href={`/podcasts/${podcast_uuid}`}><a>{value}</a></Link>
    }, {
      Header: '%',
      accessor: 'percentPlayed'
    }, {
      Header: 'At',
      accessor: 'lasPlayedAt'
    }
    ],
    []
  )
  return (
    <>
      <HStack>
        <Input placeholder='Search..' onChange={onSearch} />
        <Checkbox defaultIsChecked onChange={onPlayedOnly}>Played</Checkbox>
      </HStack>
      <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
        <ChakraTable columns={columns} data={data} />
        <Button isDisabled={!moreAvailable} onClick={showMore}>{moreAvailable ? 'Show More' : 'At End'} (1..{Math.min(sliceLimit, filtered.length)} of {filtered.length})</Button>
      </Flex>
    </>

  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const episodes = await getDecoratedEpisodes()

  return {
    props: { episodes, apiSignature }, // will be passed to the page component as props
    revalidate: 600 // will cause the page to revalidate every 10 minutes
  }
}
