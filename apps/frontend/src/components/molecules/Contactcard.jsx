import PropTypes from "prop-types"
import { Card } from "../atoms"

//used on the help page to contact the team

export default function Contactcard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <Card variant="glass" className="flex flex-col gap-4 h-full">
      <div className="w-10 h-10 rounded-lg bg-OffWhite/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-OffBlack dark:text-OffWhite" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-OffBlack dark:text-OffWhite mb-1">
          {title}
        </h3>
        <p className="text-sm text-OffBlack dark:text-OffWhite leading-relaxed ">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-medium text-Red hover:text-LightRed transition-colors text-left"
      >
        {actionLabel} &rarr;
      </button>
    </Card>
  )
}

Contactcard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  actionLabel: PropTypes.string.isRequired,
  onAction: PropTypes.func,
}

Contactcard.defaultProps = {
  onAction: undefined,
}
