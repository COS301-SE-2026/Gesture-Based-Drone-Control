import {useEffect, useState } from "react"
import {useNavigate, useLocation} from "react-router-dom"
import Joyride,{STATUS} from "react-joyride"
import {useTour} from "@/context/TourContext"
import TourTooltip from "../molecules/TourTooltip"


const TourController = () => {
    const { activeSteps , tourKey, endTour} = useTour()
    const navigate = useNavigate()
    const location = useLocation()
    const[stepIndex, setStepIndex]= useState(0)
    const[readyToShow, setReadyToShow] = useState(false)

    useEffect(() => {
        if(!activeSteps)
        {
            return
        }

        const step = activeSteps[stepIndex]
        if(!step)
        {
            return
        }

        setReadyToShow(false)
        if(location.pathname !== step.route) navigate(step.route)

        const t = setTimeout(() => setReadyToShow(true) ,150)
        return() => clearTimeout(t)
    },[activeSteps,stepIndex,location.pathname,navigate])

    if(!activeSteps || !readyToShow) 
    {
        return null
    }

    const handleCallback = ({ status, index, action, type }) => {
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            const isSinglePage = new Set(activeSteps.map((s) => s.route )).size ===1
            endTour(isSinglePage? activeSteps[0].route.replace("/","") : null)
            setStepIndex(0)
            return
        }
        if(type === "step:after")
        {
            setStepIndex(index + (action === "prev" ? -1 : 1))
        }
    }

    return (
        <Joyride 
        key={tourKey}
        steps={activeSteps.map((s) => ({
            target: s.target,
            content: s.content,
            disableBeacon:true,
        }))}
        stepIndex ={stepIndex}
        run
        continuous
        showSkipButton
        callback={handleCallback}
        tooltipComponent={(props) => (
            <TourTooltip {...props} step={activeSteps[stepIndex]}/>

        )}
        styles = {{overlay: {backdropFilter: "blur(4px)" } }}
        />

    )
}

export default TourController