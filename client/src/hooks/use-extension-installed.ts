import { useEffect, useState } from "react"

const EXTENSION_MARKER_ATTR = "data-cognia-extension"
const EXTENSION_READY_EVENT = "cognia:extension-ready"

function readMarker(): boolean {
  if (typeof document === "undefined") return false
  return document.documentElement.hasAttribute(EXTENSION_MARKER_ATTR)
}

/**
 * Reports whether the Cognia browser extension is present on this page.
 * The extension's content script tags <html> with `data-cognia-extension`
 * and dispatches a `cognia:extension-ready` event on load. This hook
 * handles both: SPA mounts before the content script (event), and SPA
 * mounts after (attribute already set).
 */
export function useExtensionInstalled(): boolean {
  const [installed, setInstalled] = useState<boolean>(() => readMarker())

  useEffect(() => {
    if (typeof document === "undefined") return

    if (readMarker()) {
      setInstalled(true)
      return
    }

    const handleReady = () => setInstalled(true)
    document.addEventListener(EXTENSION_READY_EVENT, handleReady)

    const observer = new MutationObserver(() => {
      if (readMarker()) {
        setInstalled(true)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [EXTENSION_MARKER_ATTR],
    })

    return () => {
      document.removeEventListener(EXTENSION_READY_EVENT, handleReady)
      observer.disconnect()
    }
  }, [])

  return installed
}
