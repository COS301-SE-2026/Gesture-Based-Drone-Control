import { useEffect,useState} from "react"
import PropTypes from "prop-types"
import HandSkeleton from "./HandSkeleton"


function computeIdlePose(pose,t,seed=0){
    return pose.map((d,i) => ({
        c: Math.min(1,Math.max(0, d.c + Math.sin(t*1.6 +i*1.25+seed)*0.02)),
        s:d.s + Math.sin(t*1.05+i*0.8 +seed)*0.008,
    }))
}
 const poseShape = PropTypes.arrayOf(
        PropTypes.shape({c:PropTypes.number.isRequired, s:PropTypes.number.isRequired})
    )
export default function GestureTargetSkeleton({pose}) {
    const[t,setT]= useState(0)

    useEffect(()=>{
        let raf
        let last = performance.now()
        const loop = (now) => {
            const dt = Math.min(0.1 , (now-last) /1000)
            last = now
            setT((prev) => prev + dt)
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    },[])


    const sway = Math.sin(t*0.7) *1.6
    const bob = Math.sin(t*1.1)* 2.2

    const isTwoHand = !Array.isArray(pose)

    if(!isTwoHand){
        const idlePose=computeIdlePose(pose,t)
        return <HandSkeleton pose={idlePose} sway={sway} bob={bob}/>
    }

    const leftIdle = computeIdlePose(pose.left, t,0.6)
    const rightIdle =computeIdlePose(pose.right,t)

    return(
        <div className="flex items-center justify-center gap-2 w-full h-full">
            <div className="w-1/2 h-full scale-x-[-1]">
            <HandSkeleton pose ={leftIdle} sway = {-sway} bob = {bob}/>
            </div>
            <div className="w-1/2 h-full">
             <HandSkeleton pose ={rightIdle} sway = {sway} bob = {bob}/>
             </div>
             </div>
        
    )

   

}

GestureTargetSkeleton.propTypes={
    pose: PropTypes.oneOfType([
        poseShape.isRequired,
        PropTypes.shape({
            left:poseShape.isRequired,
            right:poseShape.isRequired,
        })
    ]).isRequired,
}