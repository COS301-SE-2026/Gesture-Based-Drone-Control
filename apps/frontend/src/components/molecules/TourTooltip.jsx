import { Card } from "../atoms"

const TourTooltip = ({
  index,
  size,
  isLastStep,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  step,
}) => (
  <div {...tooltipProps}>
    <Card variant="glass" className="max-w-xs">
      <div className="flex flex-col gap-3">
        <h4 className="text-md font-semibold text-ink">{step?.title}</h4>
        <p className="text-sm text-dim">{step?.content}</p>
        <div className="flex items-center justify-between pt-2">
          <button
            {...skipProps}
            className="text-xs text-dim underline underline-offset-2"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="text-xs px-3 py-1.5 rounded-md border border-line text-ink hover:bg-panel transition-colors"
              >
                Back
              </button>
            )}
            <button
              {...(isLastStep ? closeProps : primaryProps)}
              className="text-xs px-3 py-1.5 rounded-md bg-red text-white hover:opacity-90 transition-colors"
            >
              {isLastStep ? "Done" : `Next (${index + 1}/${size})`}
            </button>
          </div>
        </div>
      </div>
    </Card>
  </div>
)

export default TourTooltip
