import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import Joyride, { STATUS, EVENTS } from "react-joyride"
import { useTour } from "@/context/TourContext"
import TourTooltip from "../molecules/TourTooltip"
import TourBlurOverlay from "./Tourbluroverlay"

const TIP_W = 340
const TIP_H = 200
const GAP = 24

const pickPlacement = (selector) => {
  const el =document.querySelector(selector)
  if(!el)
  {
    return "bottom"
  }
  const r = el.getBoundingClientRect()
  if(window.innerHeight - r.bottom >= TIP_H + GAP)
  {
    return "bottom"
  }

  if(window.innerWidth - r.right >= TIP_W + GAP)
  {
    return "right"
  }

  if(r.left >= TIP_W + GAP)
  {
    return "left"
  }

  if(r.top >= TIP_H + GAP)
  {
    return "top"
  }

  return null
}

const resolve = (s) => {
if (!s)
{
  return { target:undefined, placement:"bottom"}
}
const full = pickPlacement(s.target)
if(full) return {target:s.target,placement:full}

const anchor = s.anchor ?? `${s.target} > *:first-child`
if(document.querySelector(anchor)) {
  return { target:anchor,placement:pickPlacement(anchor) ?? "bottom"}
}
return {target: s.target, placement:"bottom"}
}

//WHAT A PROBLAMATIC FILE OMG
const TourController = () => {
  const { activeSteps, tourKey, endTour } = useTour()
  const navigate = useNavigate()
  const location = useLocation()
  const [stepIndex, setStepIndex] = useState(0)

  const [readyStep, setReadyStep] = useState(-1)
  const readyToShow = !!activeSteps && readyStep === stepIndex

  const[,setLayoutTick] = useState(0)
  useEffect(() => {
    const bump = () => setLayoutTick((n) => n+1)
    window.addEventListener("resize", bump)
    return () => window.removeEventListener("resize", bump)
  },[])

  //so that the scroll lock can be avoided
  useEffect(() => {
    if (!activeSteps || !readyToShow) {
      const t = setTimeout(() => {
        document.body.style.overflow = ""
        document.documentElement.style.overflow = ""
        document.querySelector("main")?.style.removeProperty("overflow")
      }, 100)
      return () => clearTimeout(t)
    }
  }, [activeSteps, readyToShow])

  useEffect(() => {
    if (!activeSteps) {
      return
    }

    const step = activeSteps[stepIndex]
    if (!step) {
      return
    }

    if (location.pathname !== step.route) {
      console.log("[tour] navigating", {
        from: location.pathname,
        to: step.route,
      })
      navigate(step.route)
      return //re runs automaticaaly after the location.pathname updates
    }

    console.log("[tour] on correct route, polling for target", step.target)

    let cancelled = false
    const maxWaitMs = 5000
    const intervalMs = 100
    let waited = 0

    const check = setInterval(() => {
      if (cancelled) {
        return
      }
      const found = document.querySelector(step.target)
      waited += intervalMs
      if (found) {
        clearInterval(check)
        found.style.scrollMarginTop = "24px"
        found.scrollIntoView({ behavior: "instant", block: "start" })
        setTimeout(() => setReadyStep(stepIndex), 300)
        return
      }
      if (waited >= maxWaitMs) {
        clearInterval(check)
        console.warn(
          `[tour]:gave up waiting for "${step.target}",skipping step`
        )

        //errors be forming so...lets see if skipping ourselves work instead of mounting the Joyride over a target.
        setStepIndex((i) => {
          const next = i + 1
          if (next >= activeSteps.length) {
            const isSinglePage =
              new Set(activeSteps.map((s) => s.route)).size === 1
            endTour(isSinglePage ? activeSteps[0].route.replace("/", "") : null)
          }
          return next
        })
      }
    }, intervalMs)

    return () => {
      cancelled = true
      clearInterval(check)
    }
  }, [activeSteps, stepIndex, location.pathname, navigate, endTour])

  if (!activeSteps || !readyToShow) {
    return null
  }

  const handleCallback = ({ status, index, action, type }) => {
    console.log("[tour] callback", { status, index, action, type })
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      const isSinglePage = new Set(activeSteps.map((s) => s.route)).size === 1
      endTour(isSinglePage ? activeSteps[0].route.replace("/", "") : null)
      setStepIndex(0)
      return
    }
    if (type === "step:after" || type === EVENTS.TARGET_NOT_FOUND) {
      setReadyStep(-1)
      setStepIndex(index + (action === "prev" ? -1 : 1))
    }
  }

  const current = resolve(activeSteps[stepIndex])
  return (
    <>
      <TourBlurOverlay target={current.target} />
      <Joyride
        key={tourKey}
        steps={activeSteps.map((s,i) => ({
          target: i === stepIndex ? current.target : s.target,
          title: s.title,
          content: s.content,
          placement:i === stepIndex ? current.placement : "bottom",
          disableBeacon: true,
        }))}
        floaterProps={{
          offset:16,
          disableFlip:true,
        }}
        stepIndex={stepIndex}
        run
        continuous
        showSkipButton
        disableScrolling
        disableScrollParentFix
        disableOverlayClose
        callback={handleCallback}
        tooltipComponent={TourTooltip}
        styles={{
          options: {
            zIndex: 10500,
          },
          overlay: { backgroundColor: "transparent" },
          spotlight: { backgroundColor: "transparent" },
        }}
      />
    </>
  )
}

export default TourController
