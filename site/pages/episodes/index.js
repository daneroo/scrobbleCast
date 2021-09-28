import { useState, useMemo } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import {
  Heading, Text, Flex, VStack, Button
} from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'
import ChakraTable from '../../components/ChakraTable'

// import { fromNow, humanDuration } from '../../lib/date.js'
import { getDecoratedEpisodes, getApiSignature } from '../../lib/api'

export default function EpisodesPage ({ episodes, apiSignature, loadedIndexes, addLoadedIndex }) {
  const playedEpisodes = episodes.filter((e) => e.playedTime > 0)
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
          <EpisodeList episodes={playedEpisodes} />
        </VStack>
      </PageLayout>
    </>
  )
}

function asPercentage (playedProportion) {
  return `${(playedProportion * 100).toFixed(2)}%`
}

function EpisodeList ({ episodes }) {
  // Shortened episode list
  const [sliceLimit, setSliceLimit] = useState(5)
  const moreAvailable = (sliceLimit < episodes.length)
  function showMore () {
    setSliceLimit(Math.min(sliceLimit + 20, episodes.length))
  }

  // const { uuid, title, playedProportion, duration, lastPlayed, firstPlayed, podcast } = episode

  const data = useMemo(
    () => episodes
      .slice(0, sliceLimit)
      // .filter((b) => b?.userShelves !== 'to-read')
      .map((b) => ({
        ...b,
        percentPlayed: asPercentage(b?.playedProportion),
        podcastTitle: b?.podcast?.title,
        updatedAt: b?.meta?.__lastUpdated,
        firstSeenAt: b?.meta?.__firstSeen,
        lasPlayedAt: b?.meta?.__lastPlayed
      })),
    [sliceLimit]
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
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      <ChakraTable columns={columns} data={data} />
      <Button isDisabled={!moreAvailable} onClick={showMore}>{moreAvailable ? 'Show More' : 'At End'} (1..{sliceLimit} of {episodes.length})</Button>
    </Flex>
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const episodes = await getDecoratedEpisodes()

  return {
    props: { episodes, apiSignature } // will be passed to the page component as props
    // revalidate: 0,
  }
}
