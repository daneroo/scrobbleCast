import Head from 'next/head'
import { Heading, Link, Text, Code, Flex, Box, Image, HStack, VStack } from '@chakra-ui/react'

export default function Home () {
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
        <Footer />
      </VStack>
    </>
  )
}

function Footer () {
  return (
    <Flex
      as='footer'
      justifyContent='center' alignItems='center'
      height='100px'
      borderTop='1px solid #eaeaea' w='100%'
    >
      <Link
        href='https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app'
        target='_blank'
        rel='noopener noreferrer'
      >
        <HStack>
          <span>Powered by</span>
          <Image height='1em' src='/vercel.svg' alt='Vercel Logo' />
        </HStack>
      </Link>
    </Flex>
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
