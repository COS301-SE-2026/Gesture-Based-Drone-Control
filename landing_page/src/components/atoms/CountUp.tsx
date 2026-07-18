import { useEffect, useRef, useState } from "react"
import { reducedMotion } from "../../lib/motion"

export default function CountUp({
  to,
  suffix = "",
}: {
  to: number
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  //reduced motion users see final # instantly
  const [n, setN] = useState(() => (reducedMotion() ? to : 0))

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const dur = 1200
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / dur)
          setN(Math.round(to * (1 - Math.pow(1 - k, 3))))
          if (k < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  )
}
