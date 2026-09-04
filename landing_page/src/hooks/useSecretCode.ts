import { useEffect, useRef } from "react"

export const CODEX = ["c", "o", "d", "e", "x"]

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  )
}

export default function useSecretCode(
  sequence: string[],
  onUnlock: () => void,
  enabled = true
) {
  const buffer = useRef<string[]>([])
  const cb = useRef(onUnlock)

  useEffect(() => {
    cb.current = onUnlock
  }, [onUnlock])

  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()

      buffer.current.push(key)
      if (buffer.current.length > sequence.length) buffer.current.shift()
      if (buffer.current.length < sequence.length) return

      for (let i = 0; i < sequence.length; i++) {
        if (buffer.current[i] !== sequence[i]) return
      }

      buffer.current = []
      cb.current()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sequence, enabled])
}
