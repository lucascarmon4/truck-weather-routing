import { Box } from '@mui/material'
import { DestinationPin, MoonIcon, TruckIcon } from '../components/icons'

const labelSx = {
  px: 1,
  py: '2px',
  borderRadius: 1,
  bgcolor: '#1A1F26',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
} as const

export function OriginMarker({ label }: { label: string }) {
  return (
    <Box sx={{ position: 'relative', width: 16, height: 16 }}>
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          bgcolor: '#FFFFFF',
          border: '4px solid #1A1F26',
          boxSizing: 'border-box',
          boxShadow: '0 1px 4px rgba(16,24,40,0.3)',
        }}
      />
      <Box sx={{ ...labelSx, position: 'absolute', left: 22, top: -20 }}>{label}</Box>
    </Box>
  )
}

export function DestinationMarker({ label }: { label: string }) {
  return (
    <Box sx={{ position: 'relative', width: 24, height: 30 }}>
      <DestinationPin />
      <Box sx={{ ...labelSx, position: 'absolute', left: 6, top: 36 }}>{label}</Box>
    </Box>
  )
}

export function RouteBadge({ letter, selected, onClick }: { letter: string; selected: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={`Select route ${letter}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      sx={{
        width: 22,
        height: 22,
        p: 0,
        borderRadius: '50%',
        border: '2px solid',
        boxSizing: 'border-box',
        font: 'inherit',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: '18px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(16,24,40,0.25)',
        ...(selected
          ? { bgcolor: '#1F5FBF', color: '#FFFFFF', borderColor: '#FFFFFF' }
          : { bgcolor: '#FFFFFF', color: '#3A424D', borderColor: '#8F96A0' }),
      }}
    >
      {letter}
    </Box>
  )
}

export function RestMarker({ label }: { label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pointerEvents: 'none', transform: 'translate(9px, 14px)' }}>
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: 1,
          bgcolor: '#FFFFFF',
          border: '1.5px solid #5B6470',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3A424D',
        }}
      >
        <MoonIcon size={11} />
      </Box>
      <Box sx={{ fontSize: 11, fontWeight: 600, color: '#3A424D', whiteSpace: 'nowrap', textShadow: '0 0 2px #fff, 0 0 3px #fff' }}>
        {label}
      </Box>
    </Box>
  )
}

export function TruckMarker({ letter, selected, status }: { letter: string; selected: boolean; status: string }) {
  const size = selected ? 30 : 22
  return (
    <Box sx={{ position: 'relative', width: size, height: size, pointerEvents: 'none' }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(selected
            ? { bgcolor: '#1A1F26', color: '#FFFFFF', boxShadow: '0 0 0 2px #FFFFFF, 0 2px 6px rgba(0,0,0,0.35)' }
            : { bgcolor: '#FFFFFF', color: '#3A424D', boxShadow: '0 0 0 1.5px #8F96A0, 0 1px 3px rgba(0,0,0,0.2)' }),
        }}
      >
        <TruckIcon size={selected ? 17 : 13} />
      </Box>
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            left: size + 6,
            top: size / 2 - 11,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1,
            borderRadius: 11,
            bgcolor: '#FFFFFF',
            boxShadow: '0 1px 4px rgba(16,24,40,0.25)',
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          <b>{letter}</b>
          <Box component="span" sx={{ color: '#3A424D' }}>{status}</Box>
        </Box>
      )}
    </Box>
  )
}
