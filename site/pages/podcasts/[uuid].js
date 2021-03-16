import Head from 'next/head'
import { Heading, Text, Box, Flex, VStack } from '@chakra-ui/react'

import { getPodcasts, getPodcastsByUUID } from '../../lib/api'

export default function PodcastPage ({ podcast }) {
  const {title} = podcast
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <VStack as='main' my='2rem'>
        <Heading as='h1' size='2xl' mb='2'>
          {title} 
        </Heading>
        <Text fontSize='2xl' mt='2'>
          Description of {title}
        </Text>
      </VStack>
    </>
  )
}

// not yet used
function Podcast ({ podcasts }) {
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
  const podcastsByUuid = await getPodcastsByUUID()

  const podcast = await podcastsByUuid[uuid]
  return {
    props: { podcast } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths() {
  const podcasts = await getPodcasts()
  console.log('uuid paths:',podcasts.length)
  return {
    paths: podcasts.map(({uuid}) => {
      return {
        params: {
          uuid,
        },
      }
    }),
    fallback: false,
  }
}
