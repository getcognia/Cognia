import React from 'react'
import { Switch } from '@/components/ui/switch'
import { ActivityIcon } from './Icons'

interface ExtensionToggleProps {
  extensionEnabled: boolean
  isLoading: boolean
  onToggle: () => void
}

export const ExtensionToggle: React.FC<ExtensionToggleProps> = ({
  extensionEnabled,
  isLoading,
  onToggle,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-foreground">
          <ActivityIcon size={13} />
        </div>
        <div className="flex flex-col min-w-0">
          <label htmlFor="extension-switch" className="text-[13px] font-medium text-foreground">
            Capture
          </label>
          <span className="text-[11px] leading-snug text-muted-foreground">
            Save context from sites you visit
          </span>
        </div>
      </div>
      <Switch
        id="extension-switch"
        checked={extensionEnabled}
        disabled={isLoading}
        onCheckedChange={onToggle}
        aria-label="Toggle capture"
      />
    </div>
  )
}
