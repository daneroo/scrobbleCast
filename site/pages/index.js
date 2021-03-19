import { useEffect } from 'react'
import Head from 'next/head'
import { Heading, Text, Flex, Box, VStack } from '@chakra-ui/react'
import Footer from '../components/Footer'
import { getApiSignature, writeStorkIndexFiles } from '../lib/api'

export default function Home ({ apiSignature }) {
  useEffect(() => {
    if (window.stork) {
      window.stork.register('scrobblecast', '/stork/scrobblecast.st')
    }
  }, [])
  return (
    <>
      <Head>
        <title>Scrobble Cast</title>
        <link rel='icon' href='/favicon.ico' />
        <script src='https://files.stork-search.net/stork.js' />
        <link rel='stylesheet' href='https://files.stork-search.net/basic.css' />
      </Head>
      <VStack as='main' px='.5rem' my='2rem'>
        <Heading as='h1' size='2xl' mb='2'>
          Scrobble Cast
        </Heading>
        <Text fontSize='2xl' mt='2'>
          My podcast listening scrobbler
        </Text>
        <Box className='stork-wrapper'>
          <input placeholder='Search terms...' style={{ width: '30rem' }} data-stork='scrobblecast' className='stork-input' />
          <div data-stork='scrobblecast-output' className='stork-output' />
        </Box>

        <Flex flexWrap='wrap' alignItems='center' justifyContent='center' maxW='800px' mt='10'>
          <Card href='/podcasts'>
            <Heading as='h3' size='lg' mb='2'>Podcasts →</Heading>
            <Text fontSize='lg'>Podcasts I subscribe to</Text>
          </Card>
          <Card href='/episodes'>
            <Heading as='h3' size='lg' mb='2'>Episodes →</Heading>
            <Text fontSize='lg'>Recently listened episodes</Text>
          </Card>
        </Flex>
      </VStack>
      <Footer apiSignature={apiSignature} />
    </>
  )
}

function Card (props) {
  return (
    <Box
      as='a'
      p='5' m='3'
      borderWidth='1px'
      rounded='lg'
      flexBasis={['auto', '45%']}
      {...props}
    />
  )
}

const shouldWriteIndex = false

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  if (shouldWriteIndex) { await writeStorkIndexFiles() }
  return {
    props: { apiSignature }, // will be passed to the page component as props
    revalidate: 60 // in seconds
  }
}
