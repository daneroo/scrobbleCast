import { useState } from 'react'
import Head from 'next/head'
import { ChakraProvider } from '@chakra-ui/react'
import theme from '../theme'
//  Move this to module - or re-implement in chakra/emotion
import '../styles/stork-basic.css'

function MyApp ({ Component, pageProps }) {
  const [loadedIndexes, setLoadedIndexes] = useState([])
  const addLoadedIndex = (name) => setLoadedIndexes(loadedIndexes.concat([name]))

  return (
    <ChakraProvider resetCSS theme={theme}>
      <Head>
        <title>Scrobble Cast</title>
        <link rel='icon' href='/favicon.ico' />
        <script defer async src='/js/stork.js' onLoad='stork.initialize()' />
      </Head>

      <Component {...{
        loadedIndexes,
        addLoadedIndex,
        ...pageProps
      }}
      />
    </ChakraProvider>
  )
}

export default MyApp
