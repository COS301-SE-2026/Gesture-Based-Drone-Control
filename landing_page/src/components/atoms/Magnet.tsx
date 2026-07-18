import React, { useRef } from "react"
import { reducedMotion } from "../../lib/motion"

// magnet: children lead toward cursor
export default function Magnet({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    el.style.transform = "translate(" + dx * 0.22 + "px, " + dy * 0.32 + "px)"
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ""
  }
  return (
    <span
      className="md-magnet"
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </span>
  )
}
