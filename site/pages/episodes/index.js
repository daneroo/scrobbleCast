import Head from 'next/head'
import {
  Heading, Text, Box, Flex, VStack,
  Stat, StatLabel, StatNumber, StatHelpText, StatGroup
} from '@chakra-ui/react'
import moment from 'moment'
import { getEpisodes } from '../../lib/api'

export default function EpisodesPage ({ episodes }) {
  console.log({ episodes })
  return (
    <>
      <Head>
        <title>podcasts</title>
      </Head>
      <VStack as='main' my='2rem'>
        <Heading as='h1' size='2xl' mb='2'>
          Episode Listing
        </Heading>
        <Text fontSize='2xl' mt='2'>
          Recently listened episodes
        </Text>
        {episodes.length > 0 && <Episodes episodes={episodes} />}
      </VStack>
    </>
  )
}

function humanDuration (durationSeconds) {
  const d = moment.duration(durationSeconds, 'seconds')
  // return d.humanize()
  return moment.utc(d.asMilliseconds()).format('HH:mm')
}
function ago (when) {
  return moment(when).fromNow()
}
function percentComplete (playedProportion) {
  return `${(playedProportion * 100).toFixed(2)}%`
}

function Episodes ({ episodes }) {
  return (
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      {episodes.map(({ uuid, title, podcast_title, playedProportion, duration, lastPlayed, firstPlayed }) => (
        <Card key={uuid} href={`/episodes/${uuid}`}>
          <Heading as='h4' size='md'>{title}</Heading>
          <Text fontSize='lg'>{podcast_title}</Text>
          <StatGroup>
            <Stat size='sm'>
              <StatLabel>Played</StatLabel>
              <StatNumber>{percentComplete(playedProportion)}</StatNumber>
              <StatNumber>{ago(lastPlayed)}</StatNumber>
              <StatHelpText>{firstPlayed} - {lastPlayed}</StatHelpText>
            </Stat>
            <Stat size='sm'>
              <StatLabel>Duration</StatLabel>
              <StatNumber>{humanDuration(duration)}</StatNumber>
            </Stat>
          </StatGroup>
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

export async function getStaticProps (context) {
  const episodes = await getEpisodes()
  return {
    props: { episodes } // will be passed to the page component as props
    // revalidate: 0,
  }
}
