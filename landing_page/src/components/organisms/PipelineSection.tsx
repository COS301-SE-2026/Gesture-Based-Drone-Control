import React from "react"
import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import PipelineNode from "../molecules/PipelineNode"
import { STEPS } from "../../constants/content"
import "./PipelineSection.css"

export default function PipelineSection() {
  return (
    <section className="md-pipe" id="pipeline">
      <span className="md-eyebrow">
        <Scramble text="FRAME TO FLIGHT" />
      </span>
      <Reveal as="h2">
        What happens between
        <br />
        your hand and the sky
      </Reveal>
      <div className="md-pipeflow">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <PipelineNode n={s.n} title={s.t} body={s.d} delay={i * 90} />
            {i < STEPS.length - 1 && (
              <svg className="md-link" viewBox="0 0 60 24" aria-hidden="true">
                <line className="md-dash" x1="2" y1="12" x2="50" y2="12" />
                <path
                  d="M 48 6 L 58 12 L 48 18"
                  fill="none"
                  className="md-arrow"
                />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  )
}
