import { useState } from 'react'
import { Box, Flex } from '@chakra-ui/react'
import Link from 'next/link'
import { CloseIcon, HamburgerIcon as MenuIcon } from '@chakra-ui/icons'
import Stork from './Stork'

import Logo from './Logo'

// const MenuItems = (props) => {
//   const { children, isLast, href = '/', ...rest } = props
//   return (
//     <Text
//       mb={{ base: isLast ? 0 : 2, sm: 0 }}
//       mr={{ base: 0, sm: isLast ? 0 : 2 }}
//       display='block'
//       {...rest}
//     >
//       <Link href={href}>{children}</Link>
//     </Text>
//   )
// }

const debugResponsiveBrorder = {
  borderBottom: '8px',
  borderBottomColor: { base: 'red', sm: 'green', md: 'blue', lg: 'pink' }
}
export default function Header ({ loadedIndexes, addLoadedIndex, ...rest }) {
  const [show, setShow] = useState(false)
  const toggleMenu = () => setShow(!show)

  return (
    <Flex
      as='nav'
      align='center'
      justify='space-between'
      wrap='wrap'
      w='100%'
      mb={2}
      p={2}
      // bg={['primary.500', 'transparent']}
      // color={['white', 'primary.700']}
      {...debugResponsiveBrorder}
      {...rest}
    >
      <Flex align='center'>
        <Link href='/'>
          <a>
            <Logo />
          </a>
        </Link>
      </Flex>

      {/* The menu show/close: ony on base (<small) */}
      <Box
        display='none'
        // display={{ base: 'block', sm: 'none' }}
        onClick={toggleMenu}
      >
        {show ? <CloseIcon /> : <MenuIcon />}
      </Box>

      {/* Menu */}
      <Box
        // display={{ base: show ? 'block' : 'none', sm: 'block' }}
        display='block'
        // flexBasis={{ base: '100%', sm: 'auto' }}
        flexBasis='auto'
      >
        {/* Vertical or Horizontal */}
        <Flex
          align='center'
          // justify={['center', 'space-between', 'flex-end', 'flex-end']}
          // justify={'space-between'}
          // direction={['column', 'row']}
          direction='row'
          pt={[1, 0]}
        >
          <Stork
            loadedIndexes={loadedIndexes}
            addLoadedIndex={addLoadedIndex}
            name='scrobblecast'
            placeholder='Search for ...'
            // wrapperClassnames={['stork-wrapper-basic']}
            wrapperStyles={{ width: '300px' }}
            inputStyles={{ fontSize: '1.0em', zwidth: '50%' }}
          />

          {/*
          <MenuItems href='/podcasts'>Podcasts</MenuItems>
          <MenuItems href='/episodes' isLast={false}>Episodes </MenuItems>
          */}

        </Flex>
      </Box>
    </Flex>
  )
}
