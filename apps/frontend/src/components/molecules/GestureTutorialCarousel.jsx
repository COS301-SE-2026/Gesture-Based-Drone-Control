import{useState, useCallback} from "react"
import PropTypes from "prop-types"
import { Card,Label,Button} from "../atoms"
import GestureCameraFeed from "./GestureCameraFeed"

export default function GestureTutorialCarousel({gestures}) {
    const [index, setIndex] = useState(0)
    const [showHint, setShowHint] = useState(false)
    const [passed, setPassed] = useState(false)

    const current =gestures[index]

    const handleFrame = useCallback(
        (frame) => {
            if (!current || passed)
                {
                    return
                } 
            const detected = frame?.hands?.some(
                (hand) => hand.gesture === current.expectedGesture
            )
            if (detected) setPassed(true)
        },
    [current,passed]
    )

    const handleNext =() => {
        setPassed(false)
        setShowHint(false)
        setIndex((i) => Math.min(i + 1, gestures.length -1))
    }

    if(!current) return null

    return(
        <Card variant ="glass" className="flex flex-col gap-4">
            <div className ="flex items-center justify-between">
                <Label className="text-lg font-semibold">{current.name}</Label>
                <span className="text-xs text-OffBlack/60 dark:text-OffWhite/60">
                {index+1}/{gestures.length}
                </span>
            </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GestureCameraFeed className="min-h-[400px]" onFrame={handleFrame}/>
            <div className="flex flex-col gap-3">
                <img
                    src={current.gif}
                    alt={`${current.name} demo`}
                    className="rounded-lg w-full object-cover"
                />

                {showHint && (
                <p className="text-sm text-OffBlack dark:text-Grey">
                    {current.instructions}
                </p>
                )}




            <div className="flex items-center justify-between mt-auto">
                <Button variant="secondary"  size="sm" onClick={() => setShowHint((s) => !s)}>
                    {showHint ? "Hide Hint" : "Hint"}
                </Button>

                {passed? (
                    <span className ="text-sm font-semibold text-green-500">Passed!</span>
                ):(
                    <span className="text-sm text-OffBlack/60 dark:text-OffWhite/60">
                        Try the Gesture...
                    </span>
                )}

                <Button
                    variant = "default"
                    size="sm"
                    onClick ={handleNext}
                    disabled={!passed||index===gestures.length-1}
                    >
                        Next
                    </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

GestureTutorialCarousel.propTypes={
    gestures: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name:PropTypes.string.isRequired,
            instructions: PropTypes.string.isRequired,
            gif:PropTypes.string.isRequired,
            expectedGesture: PropTypes.string.isRequired,
        })
    ).isRequired,
}