import { createTheme } from '@mui/material'

export const ui = {
  primary: '#1F5FBF',
  primaryTint: '#EAF1FB',
  primaryBorder: '#BFD3F0',
  primaryInk: '#174A96',
  text: '#1A1F26',
  textSecondary: '#5B6470',
  textMuted: '#6A727D',
  textBody: '#3A424D',
  textLabel: '#47505C',
  divider: '#DDE1E6',
  dividerLight: '#EBEDF0',
  control: '#D5D9DF',
  input: '#C4C9D0',
  surface: '#F5F6F8',
  track: '#DCE3EC',
  basemap: '#EEEDE8',
  routeMuted: '#8F96A0',
  shadow: '0 1px 4px rgba(16,24,40,0.18)',
  shadowPopover: '0 6px 20px rgba(16,24,40,0.18), 0 1px 3px rgba(16,24,40,0.12)',
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ui.primary },
    text: { primary: ui.text, secondary: ui.textSecondary },
    divider: ui.divider,
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    error: { main: '#C62828' },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize: 13,
    h1: { fontSize: 16, fontWeight: 600 },
    h2: { fontSize: 14, fontWeight: 600 },
    h6: { fontSize: 16, fontWeight: 600 },
    subtitle2: { fontSize: 14, fontWeight: 600 },
    body1: { fontSize: 14 },
    body2: { fontSize: 13 },
    caption: { fontSize: 12 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums', color: ui.text, lineHeight: 1.45 },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 6 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-notchedOutline': { borderColor: ui.input } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: ui.textSecondary } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: 13,
          fontWeight: 500,
          color: ui.textBody,
          borderColor: ui.control,
          padding: '0 12px',
          '&.Mui-selected': { backgroundColor: ui.primaryTint, color: ui.primaryInk, fontWeight: 600 },
          '&.Mui-selected:hover': { backgroundColor: '#DCE8F8' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: 'rgba(26,31,38,0.94)', fontSize: 11, fontWeight: 500 } },
    },
  },
})
