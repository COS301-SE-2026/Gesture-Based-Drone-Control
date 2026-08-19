import PropTypes from "prop-types"
import { BookOpen, PlayCircle,Compass, ArrowRightCircle } from "lucide-react"
import { Card, Button } from "../atoms"

//molecule used on help page for top buttons

export default function HelpResource({ onOpenManual, onOpenTut,onStartTour }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card variant="glass" className="flex item-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-OffWhite/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-OffBlack dark:text-OffWhite" />
          </div>
          <div>
            <h3 className="font-semibold text-OffBlack dark:text-OffWhite">
              User Manual
            </h3>
          </div>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenManual}
          aria-label="User Manual"
        >
          <ArrowRightCircle />
        </Button>
      </Card>

      <Card variant="glass" className="flex item-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-Red/10 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-5 h-5 text-Red" />
          </div>
          <div>
            <h3 className="font-semibold text-OffBlack dark:text-OffWhite">
              Get started tutorial
            </h3>
          </div>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenTut}
          aria-label="Get started tutorial"
        >
          <ArrowRightCircle />
        </Button>
      </Card>

      <Card variant="glass" className="flex item-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-Red/10 flex items-center justify-center flex-shrink-0">
            <Compass className="w-5 h-5 text-OffBlack dark:text-OffWhite" />
          </div>
          <div>
            <h3 className="font-semibold text-OffBlack dark:text-OffWhite">
              Take the full tour
            </h3>
          </div>
        </div>
        <Button
          variant="secondary"
          size="lg"
          onClick={onStartTour}
          aria-label="Take the full tour"
        >
          <ArrowRightCircle />
        </Button>
      </Card>
    </section>
  )
}

HelpResource.propTypes = {
  onOpenManual: PropTypes.func,
  onOpenTut: PropTypes.func,
  onStartTour: PropTypes.func,
}

HelpResource.defaultProps = {
  onOpenManual: undefined,
  onOpenTut: undefined,
  onStartTour:undefined,
}
