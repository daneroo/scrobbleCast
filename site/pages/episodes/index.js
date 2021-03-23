import { useState } from 'react'
import Head from 'next/head'
import {
  Heading, Text, Box, Flex, VStack,
  Stat, StatLabel, StatNumber, StatHelpText, StatGroup,
  Button
} from '@chakra-ui/react'
import PageLayout from '../../components/PageLayout'

import { fromNow, humanDuration } from '../../lib/date.js'
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
          {playedEpisodes.length > 0 && <Episodes episodes={playedEpisodes} />}
        </VStack>
      </PageLayout>
    </>
  )
}

function percentComplete (playedProportion) {
  return `${(playedProportion * 100).toFixed(2)}%`
}

function Episodes ({ episodes }) {
  // Shortened episode list
  const [sliceLimit, setSliceLimit] = useState(5)
  const moreAvailable = (sliceLimit < episodes.length)
  function showMore () {
    setSliceLimit(Math.min(sliceLimit + 20, episodes.length))
  }
  return (
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      {episodes.slice(0, sliceLimit).map((episode) => {
        const { uuid, title, playedProportion, duration, lastPlayed, firstPlayed, podcast } = episode
        return (
          <Card key={uuid} href={`/episodes/${uuid}`}>
            <Heading as='h4' size='md'>{title}</Heading>
            <Text fontSize='lg'>{podcast.title}</Text>
            <StatGroup>
              <Stat size='sm'>
                <StatLabel>Played</StatLabel>
                <StatNumber>{percentComplete(playedProportion)}</StatNumber>
                <StatNumber>{fromNow(lastPlayed)}</StatNumber>
                <StatHelpText>{firstPlayed} - {lastPlayed}</StatHelpText>
              </Stat>
              <Stat size='sm'>
                <StatLabel>Duration</StatLabel>
                <StatNumber>{humanDuration(duration)}</StatNumber>
              </Stat>
            </StatGroup>
          </Card>
        )
      })}
      <Button isDisabled={!moreAvailable} onClick={showMore}>{moreAvailable ? 'Show More' : 'At End'} (1..{sliceLimit} of {episodes.length})</Button>
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
      flexBasis={['auto', '45%']}
      {...props}
    />

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
