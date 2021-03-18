import Head from 'next/head'
import { Heading, Text, Flex, Box, VStack } from '@chakra-ui/react'
import Footer from '../components/Footer'
import { getApiSignature } from '../lib/api'

export default function Home ({ apiSignature }) {
  return (
    <>
      <Head>
        <title>Scrobble Cast</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <VStack px='.5rem'>

        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Scrobble Cast
          </Heading>
          <Text fontSize='2xl' mt='2'>
            My podcast listening scrobbler
          </Text>

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
      </VStack>
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

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  return {
    props: { apiSignature }, // will be passed to the page component as props
    revalidate: 60 // in seconds
  }
}
