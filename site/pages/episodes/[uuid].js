import Head from 'next/head'
import {
  Heading, Text, Box, Flex, VStack,Code,
  Stat, StatLabel, StatNumber, StatHelpText, StatGroup
 } from '@chakra-ui/react'

 import PageLayout from '../../components/PageLayout'

import { getEpisodes,getEpisode, getApiSignature } from '../../lib/api'

export default function EpisodePage ({ episode,apiSignature , loadedIndexes, addLoadedIndex }) {
  const { uuid, title, podcast_title, playedProportion, duration, lastPlayed, firstPlayed } = episode
  return (
    <>
      <Head>
        <title>Episode - {title}</title>
      </Head>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
      <VStack as='main' my='2rem'>
        <Heading as='h1' size='xl' mb={2}>{title}</Heading>
          <Text fontSize='lg'>{podcast_title}</Text>
          <StatGroup>
            <Stat size='sm'>
              <StatLabel>Played</StatLabel>
              <StatNumber>{(playedProportion * 100).toFixed(2)}%</StatNumber>
              <StatHelpText>{firstPlayed} - {lastPlayed}</StatHelpText>
            </Stat>
            <Stat size='sm'>
              <StatLabel>Duration</StatLabel>
              <StatNumber>{duration}s</StatNumber>
            </Stat>
          </StatGroup>
      </VStack>
      </PageLayout>
    </>
  )
}

export async function getStaticProps ({params}) {
  const {uuid } = params
  const apiSignature = await getApiSignature()
  const episode = await getEpisode(uuid)
  return {
    props: { episode, apiSignature } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths() {
  const episodes = await getEpisodes()
  console.log('episode paths:',episodes.length)
  return {
    paths: episodes.map(({uuid}) => {
      return {
        params: {
          uuid,
        },
      }
    }),
    fallback: false,
  }
}