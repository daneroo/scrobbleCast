import Head from 'next/head'
import { Heading, Link, Text, Code, Flex, Box, Image, HStack, VStack } from '@chakra-ui/react'

export default function Home () {
  return (
    <>
      <Head>
        <title>Next.js Chakra-ui App</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <VStack px='.5rem'>

        <VStack as='main' my='2rem'>
          <Heading as='h1' size='2xl' mb='2'>
            Welcome to <Link color='primary' href='https://nextjs.org'>Next.js!</Link>
          </Heading>
          <Text fontSize='2xl' mt='2'>
            Get started by editing <Code>pages/index.js</Code>
          </Text>

          <Flex flexWrap='wrap' alignItems='center' justifyContent='center' maxW='800px' mt='10'>
            <Card href='https://nextjs.org/docs'>
              <Heading as='h3' size='lg' mb='2'>Documentation →</Heading>
              <Text fontSize='lg'>Find in-depth information about Next.js features and API.</Text>
            </Card>
            <Card href='https://nextjs.org/learn'>
              <Heading as='h3' size='lg' mb='2'>Learn →</Heading>
              <Text fontSize='lg'>Learn about Next.js in an interactive course with quizzes!</Text>
            </Card>
            <Card href='https://github.com/vercel/next.js/tree/master/examples'>
              <Heading as='h3' size='lg' mb='2'>Examples →</Heading>
              <Text fontSize='lg'>Discover and deploy boilerplate example Next.js projects.</Text>
            </Card>
            <Card href='https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app'>
              <Heading as='h3' size='lg' mb='2'>Deploy →</Heading>
              <Text fontSize='lg'>Instantly deploy your Next.js site to a public URL with Vercel.</Text>
            </Card>
            <Card href='https://chakra-ui.com/'>
              <Heading as='h3' size='lg' mb='2'>Chakra UI &rarr;</Heading>
              <Text fontSize='lg'>Build accessible React apps & websites with speed.</Text>
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
