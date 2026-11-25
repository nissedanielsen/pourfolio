import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  colorSchemes: {
    light: { palette: { primary: { main: '#8a4b16' }, secondary: { main: '#2f5d50' } } },
    dark: { palette: { primary: { main: '#e2a25b' }, secondary: { main: '#7fb8a6' } } },
  },
  shape: { borderRadius: 10 },
})
