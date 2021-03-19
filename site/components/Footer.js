import { Flex, HStack } from '@chakra-ui/react'
import { fromNow } from '../lib/date'
export default function Footer ({ apiSignature = {} }) {
  const { versions, generatedAt } = apiSignature
  return (
    <Flex
      as='footer'
      justifyContent='center' alignItems='center'
      borderTop='1px solid #eee' w='100%'
    >
      <HStack py='.5em'>
        <span>ScrobbleCast v{versions.pocketscrape}</span>
        <span title={generatedAt}> @{fromNow(generatedAt)}</span>
      </HStack>
    </Flex>
  )
}
