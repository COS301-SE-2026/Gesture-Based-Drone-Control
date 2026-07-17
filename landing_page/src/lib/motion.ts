import React from "react"

export const reducedMotion = (): boolean =>
    typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

// spotlight card: cursor tracked radial highlight (css vars)
// attach as onMouseMove to any element with the .md-spot class
export function spotlight(e: React.MouseEvent<HTMLElement>): void {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty("--sx", e.clientX - r.left + "px")
    el.style.setProperty("--sy", e.clientY - r.top + "px")
}

export type Theme = "dark" | "light"