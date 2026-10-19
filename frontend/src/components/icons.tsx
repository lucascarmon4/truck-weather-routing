import type { CSSProperties, ReactNode } from 'react'

type IconProps = { size?: number; color?: string; strokeWidth?: number; style?: CSSProperties }

function Stroke({ size = 18, color = 'currentColor', strokeWidth, style, children, weight = 2 }: IconProps & { children: ReactNode; weight?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth ?? weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', ...style }}
    >
      {children}
    </svg>
  )
}

export function TruckIcon(props: IconProps) {
  return (
    <Stroke {...props} weight={2.2}>
      <path d="M2.5 6.5h11v9h-11z" />
      <path d="M13.5 9.5h4.2l3.3 3.6v2.4h-7.5" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </Stroke>
  )
}

export function RouteIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" />
    </Stroke>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Stroke>
  )
}

export function SwapIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M7 20V4M7 4 3.5 7.5M7 4l3.5 3.5M17 4v16M17 20l-3.5-3.5M17 20l3.5-3.5" />
    </Stroke>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.3" />
    </Stroke>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </Stroke>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3.5 2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </Stroke>
  )
}

export function ErrorIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </Stroke>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" />
      <path d="M12 8v5M12 16.5v.01" />
    </Stroke>
  )
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16.2 9.5" />
    </Stroke>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Stroke {...props} weight={3}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Stroke>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Stroke {...props} weight={2.5}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Stroke>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </Stroke>
  )
}

export function ChevronIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m6 9 6 6 6-6" />
    </Stroke>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </Stroke>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Stroke>
  )
}

export function RetryIcon(props: IconProps) {
  return (
    <Stroke {...props} weight={2.2}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </Stroke>
  )
}

export function WeightIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M6.5 8h11l2.5 12H4z" />
      <circle cx="12" cy="5.5" r="2.5" />
    </Stroke>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 12h14" />
    </Stroke>
  )
}

export function FitIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Stroke>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <Stroke {...props} weight={3}>
      <path d="M8 5v14M16 5v14" />
    </Stroke>
  )
}

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
    </svg>
  )
}

export function StepBackIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6v12l-8.5-6z" fill="currentColor" />
      <path d="M6.5 6v12" />
    </svg>
  )
}

export function StepForwardIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6v12l8.5-6z" fill="currentColor" />
      <path d="M17.5 6v12" />
    </svg>
  )
}

export function DestinationPin({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 24 30" aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 2px rgba(16,24,40,0.35))' }}>
      <path d="M12 29s-10-9.2-10-17a10 10 0 0 1 20 0c0 7.8-10 17-10 17z" fill="#1A1F26" />
      <circle cx="12" cy="12" r="4" fill="#FFFFFF" />
    </svg>
  )
}
