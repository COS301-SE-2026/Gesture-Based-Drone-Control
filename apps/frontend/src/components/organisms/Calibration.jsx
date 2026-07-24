import { useState} from "react"
import { useNavigate } from "react-router-dom"
import { GestureCalibration } from "../molecules"
import { Label } from "../atoms"

//calibration page, mounting gesture calibration starts a run on the backend
// connecting to the ws starts it and remounting it via the key restarts one

const Calibration = () => {
    const navigate = useNavigate()
    const [runKey, setRunKey] = useState(0)

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <div>
                <Label className="text-lg font-semibold">Calibration</Label>
                <p className="text-sm text-DarkGrey mt-1">
                    Before flying, show each gesture to the camera so we can verify the
                    pipeline reads your hand reliably in this lighting. Flight commands
                    stay locked until calibration is completed or skipped.
                </p>
            </div>

            <GestureCalibration
                key={runKey}
                onComplete={() => navigate("/gestures")}
                onRestart={() => setRunKey((k) => k + 1)}
            />
        </div>
    )
}

export default Calibration