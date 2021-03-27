import { Flex } from '@chakra-ui/react'
import Header from './Header'
import Footer from './Footer'

export default function PageLayout ({ apiSignature, loadedIndexes, addLoadedIndex, children, ...otherProps }) {
  return (
    <Flex
      direction='column'
      align='center'
      maxW={{ xl: '80rem' }}
      m='0 auto'
      {...otherProps}
    >
      <Header {...{ loadedIndexes, addLoadedIndex }} />
      {children}
      <Footer apiSignature={apiSignature} />
    </Flex>
  )
}
