import { Box, Slider, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { HEATMAP_SCALES, scaleGradient, type HeatmapLayer } from '../domain/heatmap'
import { ui } from '../theme'

type Props = {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  layer: HeatmapLayer
  onLayerChange: (layer: HeatmapLayer) => void
  opacity: number
  onOpacityChange: (opacity: number) => void
}

const Divider = () => <Box component="span" sx={{ width: '1px', height: 24, bgcolor: '#E3E6EA' }} />

export function HeatmapControls({ visible, onVisibleChange, layer, onLayerChange, opacity, onOpacityChange }: Props) {
  const scale = HEATMAP_SCALES[layer]
  const dim = visible ? 1 : 0.45
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 48,
        p: '6px 14px 6px 10px',
        boxSizing: 'border-box',
        borderRadius: 2,
        bgcolor: '#FFFFFF',
        boxShadow: ui.shadow,
      }}
    >
      <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Switch size="small" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} />
        Weather layer
      </Box>
      <Divider />
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="Heatmap layer"
        value={layer}
        onChange={(_, value: HeatmapLayer | null) => {
          if (!value) return
          onLayerChange(value)
          onVisibleChange(true)
        }}
        sx={{ opacity: dim }}
      >
        {(Object.keys(HEATMAP_SCALES) as HeatmapLayer[]).map((key) => (
          <ToggleButton key={key} value={key} sx={{ height: 32 }}>
            {HEATMAP_SCALES[key].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: dim }}>
        <Box component="span" id="opacity-label" sx={{ fontSize: 12, color: ui.textSecondary }}>Opacity</Box>
        <Slider
          size="small"
          aria-labelledby="opacity-label"
          min={10}
          max={100}
          step={5}
          value={Math.round(opacity * 100)}
          onChange={(_, value) => onOpacityChange((value as number) / 100)}
          sx={{ width: 84 }}
        />
        <Box component="span" sx={{ width: 32, fontSize: 12, color: ui.textBody }}>{Math.round(opacity * 100)}%</Box>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: 168, opacity: dim }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: ui.textSecondary }}>
          <Box component="span" sx={{ fontWeight: 600, color: ui.textBody }}>{scale.label}</Box>
          <span>{scale.unit}</span>
        </Box>
        <Box sx={{ height: 8, borderRadius: '2px', background: scaleGradient(layer) }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, lineHeight: '12px', color: ui.textSecondary }}>
          {scale.ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
