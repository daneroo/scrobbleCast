import Head from 'next/head'
import { Heading, Text, Box, Flex, VStack,Code } from '@chakra-ui/react'

import { getPodcast, getPodcasts } from '../../lib/api'

export default function PodcastPage ({ podcast }) {
  const {title,author,description} = podcast
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <VStack as='main' my='2rem' maxWidth='60rem'>
        <Heading as='h1' size='xl' mb='2'>{title}</Heading>
        <Heading as='h2' size='lg' mb='2'>by {author}</Heading>
        <Text fontSize='md' mt='2'>{description}</Text>
        <Card>
            <Code  ><pre>{JSON.stringify(podcast,null,2)}</pre></Code>
          </Card>
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
  const podcast = await getPodcast(uuid)
  return {
    props: { podcast } // will be passed to the page component as props
    // revalidate: 0,
  }
}

export async function getStaticPaths() {
  const podcasts = await getPodcasts()
  console.log('podcast paths:',podcasts.length)
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
