import { createTheme } from '@mui/material'

export const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#1f4e79' }, background: { default: '#f6f7f9' } },
  shape: { borderRadius: 8 },
  typography: { fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
})
