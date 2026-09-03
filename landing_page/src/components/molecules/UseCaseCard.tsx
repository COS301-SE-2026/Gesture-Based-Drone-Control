import Reveal from "../atoms/Reveal"
import CaseIcon from "../atoms/CaseIcon"
import { spotlight } from "../../lib/motion"
import { UseCase } from "../../constants/useCases"
import "./UseCaseCard.css"

interface Props {
  item: UseCase
  delay?: number
}

export default function UseCaseCard({ item, delay = 0 }: Readonly<Props>) {
  return (
    <Reveal
      as="article"
      className="md-uccard md-card md-spot"
      delay={delay}
      onMouseMove={spotlight}
    >
      <span className="md-ucnum" aria-hidden="true">
        {item.n}
      </span>
      <CaseIcon name={item.icon} />
      <h3>{item.t}</h3>
      <p>{item.d}</p>
      {item.href && (
        <a className="md-ucgo" href={item.href}>
          {item.hrefLabel} <i aria-hidden="true">→</i>
        </a>
      )}
    </Reveal>
  )
}
