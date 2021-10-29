import Head from 'next/head'
import {
  Heading,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup
} from '@chakra-ui/react'

import PageLayout from '../../components/PageLayout'

import { getEpisodes, getEpisode, getApiSignature } from '../../lib/api'

export default function EpisodePage ({
  episode,
  apiSignature,
  loadedIndexes,
  addLoadedIndex
}) {
  const {
    title,
    podcast_title: podcastTitle,
    playedProportion,
    duration,
    lastPlayed,
    firstPlayed
  } = episode
  return (
    <>
      <Head>
        <title>Episode - {title}</title>
      </Head>
      <PageLayout {...{ apiSignature, loadedIndexes, addLoadedIndex }}>
        <VStack as='main' my='2rem'>
          <Heading as='h1' size='xl' mb={2}>
            {title}
          </Heading>
          <Text fontSize='lg'>{podcastTitle}</Text>
          <StatGroup p={2} borderWidth='1px' rounded='lg'>
            <Stat size='md' px={3}>
              <StatLabel>Played</StatLabel>
              <StatNumber>{(playedProportion * 100).toFixed(0)}%</StatNumber>
              <StatHelpText>
                {firstPlayed} {lastPlayed ? `- ${lastPlayed}` : ''}
              </StatHelpText>
            </Stat>
            <Stat size='md' px={3}>
              <StatLabel>Duration</StatLabel>
              <StatNumber>{(duration / 60).toFixed(0)}m</StatNumber>
            </Stat>
          </StatGroup>
        </VStack>
      </PageLayout>
    </>
  )
}

export async function getStaticProps ({ params }) {
  const { uuid } = params
  const apiSignature = await getApiSignature()
  const episode = await getEpisode(uuid)
  return {
    props: { episode, apiSignature }, // will be passed to the page component as props
    revalidate: 600
  }
}

export async function getStaticPaths () {
  const episodes = await getEpisodes()
  return {
    paths: episodes.map(({ uuid }) => {
      return {
        params: {
          uuid
        }
      }
    }),
    // fallback: false
    fallback: 'blocking'
  }
}
