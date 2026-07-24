import { useEffect, useRef, useState } from "react"
import { clamp01, poseAt } from "../../lib/hand"
import { CYCLE } from "../../constants/config"
import { GESTURES } from "../../constants/content"
import { reducedMotion } from "../../lib/motion"
import HandSkeleton from "../molecules/HandSkeleton"
import Scramble from "../atoms/Scramble"
import "./GestureShowcase.css"

// auto cycling gesture shwocase: hand skeleton changes poses on timer, clicking on a gesutre shows it
export default function GestureShowcase() {
  const secRef = useRef<HTMLElement | null>(null)
  const phase = useRef(0.25) // seconds into 4 gesture timeline
  const [state, setState] = useState({ p: 0.25 / (CYCLE * 4), t: 0 })

  useEffect(() => {
    const el = secRef.current
    if (!el) return
    const total = CYCLE * 4

    if (reducedMotion()) {
      const id = window.setInterval(() => {
        const i = (Math.floor(phase.current / CYCLE) + 1) % 4
        phase.current = i * CYCLE + 0.3
        setState({ p: (i + 0.2) / 4, t: 0 })
      }, 5000)
      return () => window.clearInterval(id)
    }

    let raf = 0
    let live = false
    let last = 0
    const loop = (now: number) => {
      const dt = Math.min(0.12, (now - last) / 1000) // clamp only guards tav-away jumps
      last = now
      phase.current = (phase.current + dt) % total
      setState({ p: phase.current / total, t: now / 1000 })
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !live) {
          live = true
          last = performance.now()
          raf = requestAnimationFrame(loop)
        } else if (!entry.isIntersecting && live) {
          live = false
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const jump = (i: number) => {
    phase.current = i * CYCLE + 0.3
    setState((s) => ({ ...s, p: phase.current / (CYCLE * 4) }))
  }

  const { p, t } = state
  // gentle idle life on top of timed changes
  const base = poseAt(p)
  const pose = base.map((d, i) => ({
    c: clamp01(d.c + Math.sin(t * 1.6 + i * 1.25) * 0.02),
    s: d.s + Math.sin(t * 1.05 + i * 0.8) * 0.008,
  }))
  const sway = Math.sin(t * 0.7) * 1.6
  const bob = Math.sin(t * 1.1) * 2.2
  const seg = p * 4
  const active = Math.floor(seg) % 4
  //looping distance from a chapters centre
  const cyc = (a: number) => (((a % 4) + 6) % 4) - 2

  return (
    <section className="md-pinwrap" id="gestures" ref={secRef}>
      <div className="md-pin">
        <header className="md-pinhead">
          <span className="md-eyebrow">
            <Scramble text="THE VOCABULARY" />
          </span>
          <h2>
            Four gestures.
            <br />
            Full control.
          </h2>
        </header>

        <div className="md-pingrid">
          {/* rail and copy */}
          <div className="md-raily">
            <div className="md-rail" aria-hidden="true">
              <div className="md-railfill" style={{ height: p * 100 + "%" }} />
            </div>
            <ol className="md-railnames">
              {GESTURES.map((g, i) => (
                <li key={g.cmd} className={i === active ? "md-on" : ""}>
                  <button
                    type="button"
                    onClick={() => jump(i)}
                    aria-pressed={i === active}
                  >
                    <em>{g.name}</em>
                    <span>{g.verb}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="md-gcopy">
              {GESTURES.map((g, i) => {
                const dc = cyc(seg - (i + 0.5))
                const op = clamp01(1.25 - Math.abs(dc) * 1.9)
                return (
                  <div
                    key={g.cmd}
                    className="md-gcard"
                    style={{
                      opacity: op,
                      transform: "translateY(" + dc * -22 + "px)",
                    }}
                  >
                    <p>{g.desc}</p>
                    {/* pasted → */}
                    <code className="md-cmd">TX → {g.cmd}</code>
                  </div>
                )
              })}
            </div>
          </div>

          {/* changing skeleton stuffs */}
          <figure className="md-panel md-handpanel">
            <figcaption className="md-panellabel">
              {/* · special floating dot pasted */}
              CAMERA · 21 LANDMARKS · LIVE
            </figcaption>
            {GESTURES.map((g, i) => {
              const dc = cyc(seg - (i + 0.5))
              const op = clamp01(1.3 - Math.abs(dc) * 2.1)
              return (
                <span
                  key={g.cmd}
                  className="md-verb"
                  aria-hidden="true"
                  style={{
                    opacity: op,
                    transform: "translateY(" + dc * -34 + "px)",
                  }}
                >
                  {g.verb}
                </span>
              )
            })}
            <HandSkeleton pose={pose} sway={sway} bob={bob} />
            <span className="md-panelfoot">
              TX → {GESTURES[active].cmd} · CONF 0.{String(94 + active)}
            </span>
          </figure>
        </div>

        <p className="md-scrollhint">
          CYCLING AUTOMATICALLY · CLICK A GESTURE TO JUMP
        </p>
      </div>
    </section>
  )
}
