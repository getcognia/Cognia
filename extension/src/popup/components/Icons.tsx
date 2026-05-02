import * as React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number }

const baseSvgProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const PlusIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const XIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

export const GlobeIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
)

export const ShieldIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
  </svg>
)

export const ExternalLinkIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M14 4h6v6M10 14L20 4M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </svg>
)

export const ActivityIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

export const SparklesIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM5 16l.7 1.4 1.3.6-1.3.6L5 20l-.7-1.4L3 18l1.3-.6z" />
  </svg>
)

export const BookmarkIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

export const CheckIcon: React.FC<IconProps> = ({ size = 14, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...baseSvgProps} {...rest}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
