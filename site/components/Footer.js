import { Flex, HStack } from '@chakra-ui/react'
import { fromNow } from '../lib/date'

const defaultAPISignature = { versions: { pocketsrape: '0.0', node: '12.0' }, generatedAt: '1970-01-01T00:00:00.000Z' }
export default function Footer ({ apiSignature = defaultAPISignature }) {
  const { versions, generatedAt } = apiSignature
  return (
    <Flex
      as='footer'
      justifyContent='center' alignItems='center'
      borderTop='1px solid #eee' w='100%'
    >
      <HStack py='.5em'>
        <span>ScrobbleCast v{versions.pocketscrape} </span>
        <span title={generatedAt}> @{fromNow(generatedAt)}</span>
      </HStack>
    </Flex>
  )
}
