import { useEffect, useRef } from "react"

export default function CursorGlow() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    let raf = null
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2

    const move = (e) => {
      x = e.clientX
      y = e.clientY
      if (raf) {
        return
      }
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        raf = null
      })
    }

    window.addEventListener("mousemove", move)
    return () => {
      window.removeEventListener("mousemove", move)
      if (raf) {
        cancelAnimationFrame(raf)
      }
    }
  }, [])
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}
