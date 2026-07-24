import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import Magnet from "../atoms/Magnet"
import Button from "../atoms/Button"
import { DOCS } from "../../constants/config"
import "./DocsSection.css"

// entry point to go into docs part of website, seperate static site deployed under./docs/ on same gh-pages branch

interface DocLink {
  n: string
  t: string
  d: string
  h: string
}

const DOC_LINKS: DocLink[] = [
  {
    n: "01",
    t: "User Manual",
    d: "Set up, sign, and fly the drone with your hand - start here.",
    h: DOCS + "MANUAL/",
  },
  {
    n: "02",
    t: "Requirements (SRS)",
    d: "Functional requirements, use cases and the tracebility matrix.",
    h: DOCS + "SRS/",
  },
  {
    n: "03",
    t: "Architectutre (SAS)",
    d: "The gesture-to-flight pipeline, services and design decisions.",
    h: DOCS + "SAS/",
  },
  {
    n: "04",
    t: "Coding Standards",
    d: "Conventions, linting rules and review requirements for the codebase.",
    h: DOCS + "CODING/",
  },
  {
    n: "05",
    t: "Testing Policy",
    d: "Testing types, coverage targets and acceptance criteria.",
    h: DOCS + "POLICY/",
  },
  {
    n: "06",
    t: "Brand Style Guide",
    d: "Colours, typography and voice, the design system behind Mudra.",
    h: DOCS + "BRAND/",
  },
]

export default function DocsSection() {
  return (
    <section className="md-docs" id="docs">
      <span className="md-eyebrow">
        <Scramble text="READ THE FINE PRINT" />
      </span>
      <Reveal as="h2">Documentation</Reveal>
      <p className="md-docsub">
        Eveything behind the demo -requirements, architecture, coding standards,
        testing policy and others, lives in the project documentation.
      </p>
      <div className="md-docgrid">
        {DOC_LINKS.map((l, i) => (
          <Reveal
            as="a"
            className="md-doccard"
            href={l.h}
            key={l.n}
            delay={i * 90}
          >
            <em>{l.n}</em>
            <h3>{l.t}</h3>
            <p>{l.d}</p>
            <span className="md-docgo">OPEN ↗</span>
          </Reveal>
        ))}
      </div>
      <div className="md-ctarow md-center">
        <Magnet>
          <Button href={DOCS}>Browse all documentation</Button>
        </Magnet>
      </div>
    </section>
  )
}
