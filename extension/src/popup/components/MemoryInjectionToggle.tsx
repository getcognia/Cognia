import React from 'react'
import { Switch } from '@/components/ui/switch'
import { SparklesIcon } from './Icons'

interface MemoryInjectionToggleProps {
  memoryInjectionEnabled: boolean
  isLoading: boolean
  onToggle: () => void
}

export const MemoryInjectionToggle: React.FC<MemoryInjectionToggleProps> = ({
  memoryInjectionEnabled,
  isLoading,
  onToggle,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-foreground">
          <SparklesIcon size={13} />
        </div>
        <div className="flex flex-col min-w-0">
          <label htmlFor="memory-switch" className="text-[13px] font-medium text-foreground">
            Memory injection
          </label>
          <span className="text-[11px] leading-snug text-muted-foreground">
            Add saved memories to AI prompts
          </span>
        </div>
      </div>
      <Switch
        id="memory-switch"
        checked={memoryInjectionEnabled}
        disabled={isLoading}
        onCheckedChange={onToggle}
        aria-label="Toggle memory injection"
      />
    </div>
  )
}
