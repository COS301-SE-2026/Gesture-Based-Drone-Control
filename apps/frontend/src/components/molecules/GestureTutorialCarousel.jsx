import { useState, useCallback } from "react"
import PropTypes from "prop-types"
import { Card, Label, Button } from "../atoms"
import GestureCameraFeed from "./GestureCameraFeed"
import GestureTargetSkeleton from "./GestureTargetSkeleton"

const MATCHED_COLOR = "#22c55e"
const UNMATCHED_COLOR = "#ef4444"

export default function GestureTutorialCarousel({ gestures }) {
  const [index, setIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [passed, setPassed] = useState(false)

  const current = gestures[index]
  const matchesGesture = (hands, expected) => {
    if (typeof expected === "string") {
      return hands?.some((hand) => hand.gesture === expected)
    }
    const right = hands?.find((h) => h.handedness === "RIGHT")
    const left = hands?.find((h) => h.handedness === "LEFT")
    return right?.gesture === expected.right && left?.gesture === expected.left
  }

  const handleFrame = useCallback(
    (frame) => {
      if (!current || passed) {
        return
      }
      if (matchesGesture(frame?.hands, current.expectedGesture)) setPassed(true)
    },
    [current, passed]
  )

  const handleNext = () => {
    setPassed(false)
    setShowHint(false)
    setIndex((i) => Math.min(i + 1, gestures.length - 1))
  }

  if (!current) return null

  return (
    <Card variant="glass" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">{current.name}</Label>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold ${passed ? "text-success scale-105" : "text-dim scale-105"}`}
          >
            {passed ? "Matched!" : "Try the gesture..."}
          </span>
          <span className="text-xs text-ink/60 font mono tabular-nums">
            {index + 1}/{gestures.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GestureCameraFeed
          className="min-h-[400px]"
          onFrame={handleFrame}
          skeletonColor={passed ? MATCHED_COLOR : UNMATCHED_COLOR}
        />

        <div className="flex flex-col gap-3">
          <div
            className={`relative min-h-[400px] rounded-lg border overflow-hidden transition-colors duration-300 ${
              passed ? "border-success/60" : "border-line"
            }`}
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: passed ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center bg-ink/5"
                style={{ backfaceVisibility: "hidden" }}
              >
                <GestureTargetSkeleton pose={current.pose} />
              </div>
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <video
                  key={current.id}
                  src={current.droneVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showHint
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <p className="text-sm text-dim">{current.instructions}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowHint((s) => !s)}
            >
              {showHint ? "Hide Hint" : "Hint"}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleNext}
              disabled={!passed || index === gestures.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

GestureTutorialCarousel.propTypes = {
  gestures: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      instructions: PropTypes.string.isRequired,
      pose: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.shape({ left: PropTypes.array, right: PropTypes.array }),
      ]),
      droneVideo: PropTypes.string.isRequired,
      expectedGesture: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          left: PropTypes.string.isRequired,
          right: PropTypes.string.isRequired,
        }),
      ]).isRequired,
    })
  ).isRequired,
}
