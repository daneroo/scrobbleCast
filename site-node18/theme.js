import { extendTheme } from '@chakra-ui/react'
import { createBreakpoints } from '@chakra-ui/theme-tools'

const fonts = { mono: '\'Menlo\', monospace' }

// Moto G4: 360x640 : base in portrait, sm in landscape
// https://www.freecodecamp.org/news/the-100-correct-way-to-do-css-breakpoints-88d6a5ba1862/
const breakpoints = createBreakpoints({
  sm: '37.5em', // 600px
  md: '56em', // 900px
  lg: '75em' // 1200px - rarely
})

const theme = extendTheme({
  colors: {
    // primary: '#0070f3',
    primary: { // https://smart-swatch.netlify.app/#0070f3
      50: '#ddf2ff',
      100: '#aed6ff',
      200: '#7dbaff',
      300: '#4a9fff',
      400: '#1a83ff',
      500: '#006ae6',
      600: '#0052b4',
      700: '#003b82',
      800: '#002351',
      900: '#000d21'
    }
  },
  fonts,
  breakpoints
})

export default theme
