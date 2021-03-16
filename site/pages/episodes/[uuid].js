import Head from 'next/head'
import {
  Heading, Text, Box, Flex, VStack,Code,
  Stat, StatLabel, StatNumber, StatHelpText, StatGroup
 } from '@chakra-ui/react'

import { getEpisodes,getEpisodesByUUID } from '../../lib/api'

export default function EpisodePage ({ episode }) {
  const { uuid, title, podcast_title, playedProportion, duration, lastPlayed, firstPlayed } = episode
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
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
          <Card>
            <Code><pre>{JSON.stringify(episode,null,2)}</pre></Code>
          </Card>
      </VStack>
    </>
  )
}

// not yet used
function Episode ({ episode }) {
  return (
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      {podcasts.map(({ uuid, title }) => (
        <Card key={uuid} href='/'>
          <Heading as='h4' size='md'>{title}</Heading>
          <Text fontSize='lg'>Description of {title}</Text>
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
      flexBasis={['auto', '45%']}
      {...props}
    />

  )
}

export async function getStaticProps ({params}) {
  const {uuid } = params
  const episodesByUuid = await getEpisodesByUUID()

  const episode = await episodesByUuid[uuid]
  return {
    props: { episode } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths() {
  const episodes = await getEpisodes()
  console.log('uuid paths:',episodes.length)
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
