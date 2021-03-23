import { Heading, Text, Flex, Box } from '@chakra-ui/react'
import PageLayout from '../components/PageLayout'
import Stork from '../components/Stork'
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
          My podcast listening scrobbler
        </Text>
        {/* <Box w='100%' maxWidth='30rem'>
          <Stork
            loadedIndexes={loadedIndexes}
            addLoadedIndex={addLoadedIndex}
            name='scrobblecast'
            placeholder='Search for ...'
            // wrapperClassnames={['stork-wrapper-basic']}
            inputStyles={{ fontSize: '1.2em' }}
          />
        </Box> */}

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
