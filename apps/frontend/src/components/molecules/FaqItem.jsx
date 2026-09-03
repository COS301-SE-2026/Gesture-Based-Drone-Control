import { useState } from "react"
import PropTypes from "prop-types"
import { ChevronDown } from "lucide-react"
import { Card } from "../atoms"

//collapsable faq item molecule used for helpp page

export default function FaqItem({ question, answer, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card variant="glass" className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm font-medium text-ink">{question}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-red transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="px-6 pb-5 text-sm text-dim leading-relaxed">{answer}</p>
      </div>
    </Card>
  )
}

FaqItem.propTypes = {
  question: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
}

FaqItem.defaultProps = {
  defaultOpen: false,
}
