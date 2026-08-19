import PropTypes from "prop-types"
import { Card } from "../atoms"

//used on the help page to contact the team

export default function Contactcard({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
  onAction,
}) {
  return (
    <Card variant="glass" className="flex flex-col gap-4 h-full transition-all duration-200 hover:-translate-y-1 hover:border-red hover:shadow-glass-hover group">
      <div className="w-10 h-10 rounded-lg bg-ink/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
        <Icon className="w-5 h-5 text-ink" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-ink mb-1">
          {title}
        </h3>
        <p className="text-sm text-dim leading-relaxed">
          {description}
        </p>
      </div>
      {href ? (
        <a
          href={href}
          onClick={onAction}
          className="inline-flex text-sm font-medium text-red items-center gap-1 hover:text-redDeep transition-all duration-200 text-left group/link"
        >
          {actionLabel} 
          <span className="transition-transform duration-200 group-hover/link:translate-x-1">
            &rarr;
          </span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 text-sm font-medium text-red hover:text-redDeep transition-all duration-200 group/link text-left"
        >
          {actionLabel} 
          <span className="transition-tranform duration-200 group-hover/link:translate-x-1">
            &rarr;
          </span>
        </button>
      )}
    </Card>
  )
}

Contactcard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  actionLabel: PropTypes.string.isRequired,
  href: PropTypes.string,
  onAction: PropTypes.func,
}

Contactcard.defaultProps = {
  href: undefined,
  onAction: undefined,
}
