import{useState, useCallback} from "react"
import propTypes from "prop-types"
import { Card,Label,Button} from "../atoms"
import GestureCameraFeed from "./GestureCameraFeed"

export default function GestureTutorialCarousel({gesture}) {
    const [index, setIndex] = useSate(0)
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
        setPassword(false)
        setShowHint(false)
        setIndex((i) => Math.min(i + 1, gestures.length -1))
    }

    if(!current) return null

    return(
        <Card variant ="glass" className="flex flex-col gap-4">
            <div className ="flex items-conter justify-between">
                <Label className="test-lg font-semibold">{current.name}</Label>
                <span className="text-xs text-OffBalck/60 dark:text-OffWhite/60">
                {index+1}/{gestures.length}
                </span>
            </div>

            <GestureCameraFeed className="min-h-[400px]" onFrame={handleFrame}/>

            {showHint && (
                <p className="text-sm text-OffBlack dark:text-Grey">
                    {current.instructions}
                </p>
            )}

            <div className="flex items-center justify-between">
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
        </Card>
    )
}

GestureTutorialCarousal.propTypes={
    gestures: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name:PropTypes.string.isRequired,
            instructions: PropTypes.string.isRequired,
            expectedGesture: PropTypes.string.isRequired,
        })
    ).isRequired,
}