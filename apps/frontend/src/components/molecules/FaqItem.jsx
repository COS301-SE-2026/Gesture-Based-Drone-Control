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
        <span className="text-sm font-medium text-OffBlack dark:text-OffWhite">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-Red transition-transform duration-200 ${
            open ? "rotate-180 text-Red" : ""
          }`}
        />
      </button>

      {open && (
        <p className = "px-6 pb-5 text-sm text-OffBlack dark:text-OffWhite leading-relaxed">
          {answer}
        </p>
      )}
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
