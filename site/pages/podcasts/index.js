import Head from 'next/head'
import { Heading, Text, Box, Flex, VStack } from '@chakra-ui/react'

import { getPodcasts } from '../../lib/api'

export default function PodcastsPage ({ podcasts }) {
  // console.log({ podcasts })
  return (
    <>
      <Head>
        <title>podcasts</title>
      </Head>
      <VStack as='main' my='2rem'>
        <Heading as='h1' size='2xl' mb='2'>
          Podcast Listing
        </Heading>
        <Text fontSize='2xl' mt='2'>
          This is a list of my subscribed podcasts
        </Text>
        {podcasts.length > 0 && <Podcasts podcasts={podcasts} />}
      </VStack>
    </>
  )
}

function Podcasts ({ podcasts }) {
  return (
    <Flex flexDirection='column' flexWrap='wrap' maxW='800px' mt='10'>
      {podcasts.map(({ uuid, title, author, description }) => (
        <Card key={uuid} href={`/podcasts/${uuid}`}>
          <Heading as='h4' size='md'>{title}  {author}</Heading>
          <Text fontSize='lg'>{description}</Text>
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
  const podcasts = await getPodcasts()
  return {
    props: { podcasts } // will be passed to the page component as props
    // revalidate: 0,
  }
}
