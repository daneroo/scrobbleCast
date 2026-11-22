import { Heading, Text, Flex, Box } from '@chakra-ui/react'
import PageLayout from '../components/PageLayout'
import { getApiSignature, getCounts } from '../lib/api'
import Link from 'next/link'

export default function Home ({
  apiSignature,
  counts,
  loadedIndexes,
  addLoadedIndex
}) {
  const sections = [
    { href: '/books', title: 'Books', subtitle: 'Read', count: counts?.books },
    {
      href: '/podcasts',
      title: 'Podcasts',
      subtitle: 'Subscribed',
      count: counts?.podcasts
    },
    {
      href: '/episodes',
      title: 'Episodes',
      subtitle: 'Recent',
      count: counts?.episodes
    }
  ]
  return (
    <>
      <PageLayout {...{ apiSignature, loadedIndexes, addLoadedIndex }}>
        <Heading as='h1' size='2xl' mb='2'>
          Scrobble Cast
        </Heading>
        <Text fontSize='2xl' mt='2'>
          What my eyes and ears have been up to
        </Text>
        <Flex
          flexWrap='wrap'
          alignItems='center'
          justifyContent='center'
          maxW='800px'
          mt='4'
        >
          {sections.map(({ href, title, subtitle, count }) => (
            <Card key={href} href={href}>
              <Heading as='h3' size='lg' mb='2'>
                {title} →
              </Heading>
              <Text fontSize='lg'>
                {count} {subtitle}
              </Text>
            </Card>
          ))}
        </Flex>
      </PageLayout>
    </>
  )
}

function Card ({ href, children }) {
  return (
    <Box
      p='5'
      m='3'
      borderWidth='1px'
      rounded='lg'
      // flexBasis={['auto', '45%']}
    >
      <Link href={href}>
        <a>{children}</a>
      </Link>
    </Box>
  )
}

export async function getStaticProps (context) {
  const apiSignature = await getApiSignature()
  const counts = await getCounts()
  return {
    props: { apiSignature, counts }, // will be passed to the page component as props
    revalidate: 60 // in seconds
  }
}
