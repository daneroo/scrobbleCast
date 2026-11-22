import { Box, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'

import Logo from './Logo'

const MenuItems = (props) => {
  const { children, href = '/', ...rest } = props
  return (
    <Text
      mx={1}
      display='block'
      {...rest}
    >
      <Link href={href}><a>{children}</a></Link>
    </Text>
  )
}

// const debugResponsiveBorder = {
//   borderBottom: '8px',
//   borderBottomColor: { base: 'red', sm: 'green', md: 'blue', lg: 'pink' }
// }

export default function Header ({ loadedIndexes, addLoadedIndex, ...rest }) {
  return (
    <Flex
      as='nav'
      align='center'
      justify='space-between'
      wrap='wrap'
      w='100%'
      mb={2}
      p={2}
      borderBottom='1px solid #eee'
      // {...debugResponsiveBorder}
      {...rest}
    >
      <Flex align='center'>
        <Link href='/'>
          <a>
            <Logo />
          </a>
        </Link>
      </Flex>

      {/* Menu */}
      <Box
        display='block'
        flexBasis='auto'
      >
        {/* Vertical or Horizontal */}
        <Flex
          align='center'
          direction='row'
          px={2}
        >
          <MenuItems href='/books'>Books</MenuItems>
          <MenuItems href='/podcasts'>Podcasts</MenuItems>
          <MenuItems href='/episodes'>Episodes </MenuItems>

        </Flex>
      </Box>
    </Flex>
  )
}
