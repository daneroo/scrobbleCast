import { useEffect, useState } from 'react'
import { Flex, HStack, Tooltip, Text } from '@chakra-ui/react'
import { fromNow, localNoTZ } from '../lib/date'

const defaultAPISignature = { versions: { pocketsrape: '0.0', node: '12.0' }, generatedAt: '1970-01-01T00:00:00.000Z' }

export default function Footer ({ apiSignature = defaultAPISignature }) {
  const { versions, generatedAt } = apiSignature

  // just for fun toggle the footer date formating every 3 seconds
  const [toggle, setToggle] = useState(false)
  useEffect(() => {
    let toggler = toggle
    const intervalID = setInterval(() => {
      toggler = !toggler
      setToggle(!toggler)
    }, 3000)

    return () => clearInterval(intervalID)
  }, [])

  return (
    <Flex
      as='footer'
      justifyContent='center' alignItems='center'
      borderTop='1px solid #eee'
      w='100%'
    >
      <HStack sx={{ color: 'gray.500', py: '.5em' }}>
        <span>ScrobbleCast v{versions.pocketscrape} </span>
        <Tooltip label={toggle ? localNoTZ(generatedAt) : fromNow(generatedAt)}>
          <Text>@ {toggle ? fromNow(generatedAt) : localNoTZ(generatedAt)}</Text>
        </Tooltip>
      </HStack>
    </Flex>
  )
}
