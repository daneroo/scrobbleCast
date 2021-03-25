import { useEffect } from 'react'
import { Box } from '@chakra-ui/react'

const indexUrls = {
  scrobblecast: '/stork/scrobblecast.st'
}

// - Stork https://github.com/jameslittle230/stork
// - James Little component https://github.com/stork-search/site/blob/master/src/components/stork.js

export default function Stork ({
  loadedIndexes,
  addLoadedIndex,
  name,
  placeholder,
  wrapperStyles,
  wrapperClassnames,
  inputStyles
}) {
  if (!loadedIndexes) {
    throw new Error('Set loadedIndexes prop!')
  }
  useEffect(() => {
    // if (loadedIndexes) { return }

    const storkOptions = {
      // onQueryUpdate: (query, results) => {
      //   window._paq.push(['trackSiteSearch', query, name, results.length])
      // },
      // onResultSelected: (query, result) => {
      //   window._paq.push(['trackEvent', 'searchResultSelected', query, result.entry.title])
      // }
    }

    // Move this all to a hook! even the global state of loaded indexes...
    async function asyncEffect () {
      console.log('stork.useEffect (async)', new Date().toISOString())
      const storkLoaded = await waitUntil(async () => typeof window?.stork !== 'undefined')
      // const storkLoaded = await waitUntil(async () => Math.random() < 0.01)
      if (!storkLoaded) {
        throw new Error('Stork global not found')
      }
      // even when stork exists, the onload may not have completed: give it another 100ms
      await delay(200)
      // or could do the initialize here..
      // if (loadedIndexes.length===0 {
      //   window.stork.initialize()
      // }
      if (!loadedIndexes.includes(name)) {
        window.stork.downloadIndex(name, indexUrls[name], storkOptions)
        addLoadedIndex(name)
      }
      window.stork.attach(name)
      console.log('stork.attached', new Date().toISOString())
      return storkLoaded
    }

    asyncEffect().catch((err) => {
      console.error(err)
    })
  }, [/* loadedIndexes, name */])
  return (
    <Box
      className={['stork-wrapper'].concat(wrapperClassnames).join(' ')}
      style={wrapperStyles}
    >
      <input
        data-stork={name}
        className='stork-input'
        placeholder={placeholder}
        style={inputStyles}
      />
      <div data-stork={`${name}-output`} className='stork-output'>
        {' '}
      </div>
    </Box>
  )
}

// below is reusable - extract
async function waitUntil (doneFn = async () => false, maxDelay = 10000, iterationDelay = 100) {
  const start = +new Date()
  console.log('waitUntil.start')

  while (true) {
    const done = await doneFn()
    if (done) {
      return true
    }
    await delay(iterationDelay)
    const elapsed = +new Date() - start
    console.log('waitUntil.max?', elapsed)
    if (elapsed >= maxDelay) {
      return false
    }
  }
}

function delay (ms = 10) {
  return new Promise(resolve => {
    setTimeout(() => { resolve() }, ms)
  })
}
