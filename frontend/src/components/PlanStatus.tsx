import { Box, Button, LinearProgress } from '@mui/material'
import { useEffect, useState } from 'react'
import { ui } from '../theme'
import { CheckIcon, ErrorIcon, PlayIcon, RetryIcon } from './icons'

export function EmptyState({ onExample }: { onExample: () => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, borderRadius: 2, bgcolor: ui.surface }}>
      <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 600 }}>Compare routes by weather risk</Box>
      <Box component="p" sx={{ m: 0, fontSize: 13, color: ui.textBody }}>
        We find up to three routes, sample the forecast at checkpoints along each one, rate wind, rain and snow against
        your load, and recommend the route with the least exposure.
      </Box>
      <Button
        variant="outlined"
        onClick={onExample}
        startIcon={<PlayIcon size={16} />}
        sx={{ alignSelf: 'flex-start', minHeight: 40, fontWeight: 500, color: ui.primaryInk, borderColor: '#9DB8E0', bgcolor: '#FFFFFF', textAlign: 'left' }}
      >
        Try an example: Chicago, IL → Denver, CO · 42,000 lb
      </Button>
    </Box>
  )
}

const STEPS = [
  { label: 'Finding routes', detail: 'Up to 3 truck routes', until: 2 },
  { label: 'Sampling weather at each checkpoint', detail: 'Hourly forecast at each ETA', until: 7 },
  { label: 'Scoring risk', detail: 'Wind, rain, snow and load rules', until: Infinity },
]

function useElapsedSeconds(startedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])
  return Math.max(0, (now - startedAt) / 1000)
}

export function LoadingState({ startedAt }: { startedAt: number }) {
  const elapsed = useElapsedSeconds(startedAt)
  const current = STEPS.findIndex((step) => elapsed < step.until)
  return (
    <Box aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, p: 2, border: `1px solid ${ui.divider}`, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 600 }}>Planning routes</Box>
        <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>{Math.floor(elapsed)} s</Box>
      </Box>
      <LinearProgress sx={{ height: 4, borderRadius: 2, bgcolor: '#DCE6F5' }} />
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column' }}>
        {STEPS.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo'
          return (
            <Box component="li" key={step.label} sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                {state === 'done' && (
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: ui.primary, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={14} />
                  </Box>
                )}
                {state === 'active' && (
                  <Box
                    component="svg"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    sx={{ animation: 'spin 0.9s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }}
                  >
                    <circle cx="12" cy="12" r="9.5" fill="none" stroke="#DCE6F5" strokeWidth={3} />
                    <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" stroke={ui.primary} strokeWidth={3} strokeLinecap="round" />
                  </Box>
                )}
                {state === 'todo' && (
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '1.5px solid #B9C0C9',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: ui.textMuted,
                    }}
                  >
                    {i + 1}
                  </Box>
                )}
                {i < STEPS.length - 1 && <Box sx={{ width: '1.5px', flex: 1, minHeight: 14, my: 0.5, bgcolor: ui.control }} />}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', pt: '2px', pb: 1.75 }}>
                <Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: state === 'todo' ? ui.textMuted : ui.text }}>{step.label}</Box>
                <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>{step.detail}</Box>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export function LoadingSkeleton() {
  const card = (opacity: number, width: number) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.75, border: `1px solid ${ui.dividerLight}`, borderRadius: 2, opacity }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#EEF0F3' }} />
        <Box sx={{ width, height: 12, borderRadius: '3px', bgcolor: '#EEF0F3' }} />
      </Box>
      <Box sx={{ height: 30, borderRadius: 1, bgcolor: '#F3F4F6' }} />
      <Box sx={{ height: 10, borderRadius: '5px', bgcolor: '#EEF0F3' }} />
    </Box>
  )
  return (
    <Box aria-hidden="true" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ height: 92, borderRadius: 2, bgcolor: '#F1F3F5' }} />
      {card(1, 140)}
      {card(0.6, 120)}
    </Box>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Box role="alert" sx={{ display: 'flex', gap: 1.5, p: '14px 16px', borderRadius: 2, bgcolor: '#FDECEA', color: '#5F1A13' }}>
      <ErrorIcon size={22} color="#C62828" />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 600 }}>Couldn’t plan routes</Box>
        <Box component="p" sx={{ m: 0, fontSize: 13 }}>{message}</Box>
        <Box component="span" sx={{ fontSize: 12, color: '#7A2E25' }}>Your trip details are kept. Edit them above or retry.</Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Button
            variant="outlined"
            onClick={onRetry}
            startIcon={<RetryIcon size={15} />}
            sx={{ height: 34, color: '#8A1C14', borderColor: '#D9A39C', bgcolor: '#FFFFFF', '&:hover': { borderColor: '#8A1C14', bgcolor: '#FFF' } }}
          >
            Retry
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
