import { useState } from "react"
import Reveal from "../atoms/Reveal"
import Scramble from "../atoms/Scramble"
import FaqItem from "../molecules/FaqItem"
import { FAQS } from "../../constants/content"
import "./FaqSection.css"

export default function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section className="md-faq" id="faq">
      <span className="md-eyebrow">
        <Scramble text="BEFORE YOU ASK" />
      </span>
      <Reveal as="h2">Questions, answered</Reveal>
      <Reveal className="md-faqlist" delay={100}>
        {FAQS.map((f, i) => (
          <FaqItem
            key={f.q}
            q={f.q}
            a={f.a}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
          />
        ))}
      </Reveal>
    </section>
  )
}
