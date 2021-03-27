import { Heading, Text, Flex, Box } from '@chakra-ui/react'
import PageLayout from '../components/PageLayout'
import { getApiSignature, writeStorkIndexFiles } from '../lib/api'

export default function Home ({ apiSignature, loadedIndexes, addLoadedIndex }) {
  return (
    <>
      <PageLayout
        {...{ apiSignature, loadedIndexes, addLoadedIndex }}
      >
        <Heading as='h1' size='2xl' mb='2'>
          Scrobble Cast
        </Heading>
        <Text fontSize='2xl' mt='2'>
          What my eyes and ears have been up to
        </Text>
        <Flex flexWrap='wrap' alignItems='center' justifyContent='center' maxW='800px' mt='4'>
          <Card href='/podcasts'>
            <Heading as='h3' size='lg' mb='2'>Podcasts →</Heading>
            <Text fontSize='lg'>Subscribed Podcasts</Text>
          </Card>
          <Card href='/episodes'>
            <Heading as='h3' size='lg' mb='2'>Episodes →</Heading>
            <Text fontSize='lg'>Recent Episodes</Text>
          </Card>
          <Card href='/books'>
            <Heading as='h3' size='lg' mb='2'>Books →</Heading>
            <Text fontSize='lg'>Recently read</Text>
          </Card>
        </Flex>
      </PageLayout>
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
      // flexBasis={['auto', '45%']}
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
