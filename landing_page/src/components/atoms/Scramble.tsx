import { useEffect, useRef, useState } from "react"
import { reducedMotion } from "../../lib/motion"

export default function Scramble({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [out, setOut] = useState(text)
  const played = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    // copy pasted this glyph symbols dont kill me
    const glyphs = "▓▒░<>/\\|=+#01AF"
    let timer = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played.current) return
        played.current = true
        io.disconnect()
        let frame = 0
        const frames = Math.max(12, Math.round(text.length * 1.4))
        timer = window.setInterval(() => {
          frame++
          const reveal = Math.floor((frame / frames) * text.length)
          let s = text.slice(0, reveal)
          for (let i = reveal; i < text.length; i++) {
            s +=
              // special · char pasted (scrambles with normal full stop)
              text[i] === " " || text[i] === "·"
                ? text[i]
                : glyphs[(Math.random() * glyphs.length) | 0]
          }
          setOut(s)
          if (reveal >= text.length) {
            window.clearInterval(timer)
            setOut(text)
          }
        }, 34)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearInterval(timer)
    }
  }, [text])
  return <span ref={ref}>{out}</span>
}
