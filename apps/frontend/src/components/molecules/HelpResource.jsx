import PropTypes from "prop-types"
import { BookOpen, PlayCircle } from "lucide-react"
import { Card } from "../atoms"

//molecule used on help page for top buttons

export default function HelpResource({ onOpenManual, onOpenTut }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Card
        variant="glass"
        clickable={true}
        onClick={onOpenManual}
        className="flex items-center justify-between gap-6 transition-all duration-200 hover:-translate-y-1 hover:border-red hover:shadow-glass-hover group"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-ink/50 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <BookOpen className="w-6 h-6 text-ink" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">User Manual</h3>
          </div>
        </div>
      </Card>

      <Card
        variant="glass"
        clickable={true}
        onClick={onOpenTut}
        className="flex items-center justify-between gap-6 transition-all duration-200 hover:-translate-y-1 hover:border-red hover:shadow-glass-hover group"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
            <PlayCircle className="w-6 h-6 text-red" />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Get started tutorial</h3>
          </div>
        </div>
      </Card>
    </section>
  )
}

HelpResource.propTypes = {
  onOpenManual: PropTypes.func,
  onOpenTut: PropTypes.func,
}

HelpResource.defaultProps = {
  onOpenManual: undefined,
  onOpenTut: undefined,
}
