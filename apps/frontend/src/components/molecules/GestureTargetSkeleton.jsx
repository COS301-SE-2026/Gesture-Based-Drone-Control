import { useEffect,useState} from "react"
import PropTypes from "prop-types"
import HandSkeleton from "./HandSkeleton"

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


    const idlePose = pose.map((d,i) => ({
        c: Math.min(1, Math.max(0, d.c + Math.sin(t* 1.6 + i * 1.25) *0.02)),
        s: d.s + Math.sin(t * 1.05 +i * 0.8) *0.008,
    }))

    const sway = Math.sin(t*0.7) *1.6
    const bob = Math.sin(t*1.1)* 2.2

    return <HandSkeleton pose ={idlePose} sway={sway} bob={bob}/>

}

GestureTargetSkeleton.propTypes={
    pose: PropTypes.arrayOf(
        PropTypes.shape({ c: PropTypes.number.isRequired, s:PropTypes.number.isRequired})

    ).isRequired,
}