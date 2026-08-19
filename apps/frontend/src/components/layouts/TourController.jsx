import {useEffect, useState, useMemo } from "react"
import {useNavigate, useLocation} from "react-router-dom"
import Joyride,{STATUS,EVENTS} from "react-joyride"
import {useTour} from "@/context/TourContext"
import TourTooltip from "../molecules/TourTooltip"
import TourBlurOverlay from "./Tourbluroverlay"

//WHAT A PROBLAMATIC FILE OMG
const TourController = () => {
    const { activeSteps , tourKey, endTour} = useTour()
    const navigate = useNavigate()
    const location = useLocation()
    const[stepIndex, setStepIndex]= useState(0)
    const[readyToShow, setReadyToShow] = useState(false)

    //so that the scroll lock can be avoided
    useEffect(() => {
        if ( !activeSteps || !readyToShow) {
            const t = setTimeout(() => {
            document.body.style.overflow = ""
            document.documentElement.style.overflow=""
            document.querySelector("main")?.style.removeProperty("overflow")
        },100)
        return () => clearTimeout(t)
    }
    },[activeSteps, readyToShow])

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

        if(location.pathname !== step.route) {
            console.log("[tour] navigating", { from: location.pathname, to: step.route})
            navigate(step.route)
            return //re runs automaticaaly after the location.pathname updates
        }

        console.log("[tour] on correct route, polling for target", step.target)
        setReadyToShow(false)

        let cancelled = false
        const maxWaitMs = 5000
        const intervalMs = 100
        let waited =0 

        const check = setInterval(() => {
            if(cancelled)
            {
                return
            }
            const found = document.querySelector(step.target)
            waited += intervalMs
            if(found) {
                clearInterval(check)
                setReadyToShow(true)
                return
            }
            if(waited>=maxWaitMs){
                clearInterval(check)
                console.warn(`[tour]:gave up waiting for "${step.target}",skipping step`)

                //errors be forming so...lets see if skipping ourselves work instead of mounting the Joyride over a target.
                setStepIndex((i) => {
                    const next = i+1
                    if(next >= activeSteps.length) {
                        const isSinglePage = new Set(activeSteps.map((s)=> s.route)).size ===1
                        endTour(isSinglePage ? activeSteps[0].route.replace("/" ,"") : null)
                    }
                    return next
                })
            
            }
        },intervalMs)

        return () => {
            cancelled = true
            clearInterval(check)
        }
    },[activeSteps,stepIndex,location.pathname,navigate, endTour])

    if(!activeSteps || !readyToShow) 
    {
        return null
    }

    const handleCallback = ({ status, index, action, type }) => {
        console.log("[tour] callback" , { status,index,action,type})
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            const isSinglePage = new Set(activeSteps.map((s) => s.route )).size ===1
            endTour(isSinglePage? activeSteps[0].route.replace("/","") : null)
            setStepIndex(0)
            return
        }
        if(type === "step:after" || type === EVENTS.TARGET_NOT_FOUND)
        {
            setReadyToShow(false)
            setStepIndex(index + (action === "prev" ? -1 : 1))
        }
    }

    const currentTarget=activeSteps[stepIndex]?.target
    return (
        <>
        <TourBlurOverlay target={currentTarget}/>
        <Joyride 
        key={tourKey}
        steps={activeSteps.map((s) => ({
            target: s.target,
            title:s.title,
            content: s.content,
            disableBeacon:true,
        }))}
        stepIndex ={stepIndex}
        run
        continuous
        showSkipButton
        disableScrolling
        disableScrollParentFix
        disableOverlayClose
        callback={handleCallback}
        tooltipComponent={TourTooltip}
        styles = {{
            options:{
                zIndex:10500
            },
            overlay: {backgroundColor: "transparent" },
            spotlight:{backgroundColor: "transparent"},
         }}
        />
        </>

    )
}

export default TourController