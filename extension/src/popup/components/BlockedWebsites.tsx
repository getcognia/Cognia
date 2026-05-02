import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { GlobeIcon, PlusIcon, ShieldIcon, XIcon } from './Icons'

interface BlockedWebsitesProps {
  blockedWebsites: string[]
  isLoading: boolean
  onAdd: (website: string) => void
  onRemove: (website: string) => void
  onBlockCurrentDomain: () => void
}

export const BlockedWebsites: React.FC<BlockedWebsitesProps> = ({
  blockedWebsites,
  isLoading,
  onAdd,
  onRemove,
  onBlockCurrentDomain,
}) => {
  const [newBlockedWebsite, setNewBlockedWebsite] = useState('')

  const handleAdd = () => {
    const value = newBlockedWebsite.trim()
    if (!value) return
    onAdd(value)
    setNewBlockedWebsite('')
  }

  const canAdd = !isLoading && newBlockedWebsite.trim().length > 0

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <ShieldIcon size={13} className="text-muted-foreground" />
          <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Privacy
          </h3>
        </div>
        {blockedWebsites.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {blockedWebsites.length} blocked
          </span>
        )}
      </header>

      <div className="px-4 pb-3 space-y-2.5">
        <p className="text-[12px] text-muted-foreground leading-snug">
          Cognia ignores these sites entirely.
        </p>

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <GlobeIcon
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="example.com"
              value={newBlockedWebsite}
              onChange={e => setNewBlockedWebsite(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
              }}
              className={cn(
                'w-full rounded-md border border-input bg-background pl-7 pr-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background'
              )}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            aria-label="Add blocked site"
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <PlusIcon size={12} />
            Add
          </button>
        </div>

        <button
          onClick={onBlockCurrentDomain}
          disabled={isLoading}
          className={cn(
            'w-full rounded-md border border-dashed border-border bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors',
            'hover:bg-accent hover:text-foreground hover:border-border',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          Block current site
        </button>
      </div>

      {blockedWebsites.length > 0 ? (
        <div className="border-t border-border px-2 py-1.5 max-h-[180px] overflow-y-auto">
          <ul className="space-y-0.5">
            {blockedWebsites.map(website => (
              <li
                key={website}
                className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  <span className="font-mono text-[11px] text-foreground truncate">{website}</span>
                </div>
                <button
                  onClick={() => onRemove(website)}
                  disabled={isLoading}
                  aria-label={`Remove ${website}`}
                  className={cn(
                    'shrink-0 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity',
                    'group-hover:opacity-100 hover:bg-background hover:text-foreground',
                    'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <XIcon size={11} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="border-t border-dashed border-border px-4 py-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            No sites blocked
          </p>
        </div>
      )}
    </section>
  )
}
