import PropTypes from "prop-types"
import { ArrowRight } from "lucide-react"
import { Card } from "../atoms"

//help page top th that displays a radar

export default function HelpTopCard({
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <Card
      clickable
      onClick={onClick}
      className="group h-full flex flex-col gap-4"
    >
      <div className="w-11 h-11 rounded-lg bg-red/10 flex items-center justify-center group-hover:bg-red/20 transition-colors">
        <Icon className="w-5 h-5 text-red" />
      </div>

      <div className="flex-1">
        <h3 className="text-ink font-semibold text-base mb-1">{title}</h3>
        <p className="text-sm text-dim leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <ArrowRight className="w-4 h-4 text-red group-hover:text-red group-hover:translate-x-1 transition-all" />
      </div>
    </Card>
  )
}

HelpTopCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onClick: PropTypes.func,
}

HelpTopCard.defaultProps = {
  onClick: undefined,
}
