import Reveal from "../atoms/Reveal"
import CountUp from "../atoms/CountUp"
import { STATS } from "../../constants/content"
import "./StatsStrip.css"

export default function StatsStrip() {
  return (
    <section className="md-stats" aria-label="Key numbers">
      {STATS.map((s, i) => (
        <Reveal key={s.label} className="md-stat" delay={i * 100}>
          <strong>
            <CountUp to={s.to} suffix={s.suffix} />
          </strong>
          <span>{s.label}</span>
        </Reveal>
      ))}
    </section>
  )
}
