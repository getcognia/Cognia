import React from "react"

import { useExtensionInstalled } from "@/hooks/use-extension-installed"

interface MemoriesEmptyStateProps {
  onInstallExtension?: () => void
  onCreateMemory?: () => void
}

/**
 * Empty state shown on the Memories page when the user has no memories yet.
 * Surfaces the two primary capture paths: install the extension or create a
 * memory manually. When the extension is detected, the install CTA is
 * replaced with a "Cognia is running" affordance.
 */
export const MemoriesEmptyState: React.FC<MemoriesEmptyStateProps> = ({
  onInstallExtension,
  onCreateMemory,
}) => {
  const extensionInstalled = useExtensionInstalled()

  const handleInstall =
    onInstallExtension ||
    (() =>
      window.open(
        "https://chromewebstore.google.com/search/cognia",
        "_blank",
        "noopener,noreferrer"
      ))

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 mb-6 flex items-center justify-center border border-gray-200 rounded-xl bg-white shadow-sm">
        <svg
          className="w-8 h-8 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-light font-editorial text-gray-900 mb-2">
        No memories yet
      </h2>
      {extensionInstalled ? (
        <>
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-700">
              Extension active
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            Cognia is running. Start browsing — pages you read will be captured
            automatically. You can also add a memory by hand.
          </p>
          {onCreateMemory && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={onCreateMemory}
                className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white hover:bg-black transition-colors"
              >
                Add a memory
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            Cognia builds a photographic memory of the web as you browse.
            Install the extension to start capturing pages, links, and context
            — or add a memory manually.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleInstall}
              className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white hover:bg-black transition-colors"
            >
              Install the extension
            </button>
            {onCreateMemory && (
              <button
                onClick={onCreateMemory}
                className="px-5 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 hover:border-black hover:bg-gray-50 transition-colors"
              >
                Add a memory
              </button>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-gray-400 mt-6 font-mono">
        Or visit /pricing to see what each plan includes.
      </p>
    </div>
  )
}

export default MemoriesEmptyState
