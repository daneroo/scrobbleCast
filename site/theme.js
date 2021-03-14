import { extendTheme } from '@chakra-ui/react'
import { createBreakpoints } from '@chakra-ui/theme-tools'

const fonts = { mono: '\'Menlo\', monospace' }

const breakpoints = createBreakpoints({
  sm: '40em',
  md: '52em',
  lg: '64em',
  xl: '80em'
})

const theme = extendTheme({
  colors: {
    primary: '#692ba8',
    purple: { // https://smart-swatch.netlify.app/#692ba8
      50: '#f5e9ff',
      100: '#dac1f3',
      200: '#c098e7',
      300: '#a571dc',
      400: '#8c48d0',
      500: '#722fb7',
      600: '#59238f',
      700: '#3f1968',
      800: '#260f40',
      900: '#10031a'
    }
  },
  fonts,
  breakpoints
})

export default theme
