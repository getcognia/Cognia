import * as React from 'react'

import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, disabled, onCheckedChange, id, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-muted'
        )}
        {...rest}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ease-out',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
