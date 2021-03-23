import { useEffect } from 'react'
import { Box } from '@chakra-ui/react'

const indexUrls = {
  scrobblecast: '/stork/scrobblecast.st'
}

const Stork = ({
  loadedIndexes,
  addLoadedIndex,
  name,
  placeholder,
  wrapperStyles,
  wrapperClassnames,
  inputStyles
}) => {
  if (!loadedIndexes) {
    throw new Error('Set loadedIndexes prop!')
  }
  console.log({ indexUrls })
  useEffect(() => {
    const storkOptions = {
      // onQueryUpdate: (query, results) => {
      //   window._paq.push(['trackSiteSearch', query, name, results.length])
      // },
      // onResultSelected: (query, result) => {
      //   window._paq.push(['trackEvent', 'searchResultSelected', query, result.entry.title])
      // }
    }
    console.log({ indexUrls })
    if (!loadedIndexes.includes(name)) {
      window.stork.downloadIndex(name, indexUrls[name], storkOptions)
      addLoadedIndex(name)
    }
    window.stork.attach(name)
  }, [])
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

export default Stork
