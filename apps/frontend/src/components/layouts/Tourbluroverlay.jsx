import {useEffect, useState} from "react"

const PADDING =8
const BLUR_PX = 4
const Z_INDEX = 10000

function getRect(selector) {
    const el = document.querySelector(selector)
    if (!el)
    {
        return null
    }

    const r = el.getBoundingClientRect()
    return{
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,

    }
}

/**So the issue is that when the spotlight is on, 
 it blurs out the entire thing including the component it is describing to the
 user itself.faaaah. So now we need a hole in the blur.another faaah 
 ...which is a bit more complicated that it looks rn. 
 So what this is gonna do is have likr 4 blurred out strips aroung the target instead. 
 The unblurred part will be the elemet we are showing the usier and the glow is still around it
 This better work */


const TourBlurOverlay = ({target}) => {
    const [rect,setRect] = useState(null)

    useEffect(() => {
        if(!target){
            setRect(null)
            return
        }

        const update = () => setRect(getRect(target))
        update()


        window.addEventListener("resize",update)
        window.addEventListener("scroll",update,true)

        const el = document.querySelector(target)
        let ro
        if(el && "ResizeObserver" in window){
            ro = new ResizeObserver(update)
            ro.observe(el)
        }

        //catches llayout shits that are not the resize or scroll stuff like loading for eg
        const poll = setInterval(update,300)


        return() => {
            window.removeEventListener("resize", update)
            window.removeEventListener("scroll", update,true)
            if(ro) ro.disconnect()
                clearInterval(poll)

        }
    },[target])

    if (!rect)
    {
        return null
    }

    const strip = {
        position:"fixed",
        backdropFilter:`blur(${BLUR_PX}px)`,
        WebkitBackdropFilter:`blur(${BLUR_PX}px)`,
        backgroundColor:"rgba(0,0,0,0.35)",
        pointerEvents:"none",
        zIndex:Z_INDEX,
    }

    return(
        <>
        {/*top strip*/}
        <div style={{ ...strip, top:0 ,left:0 , right:0,height:Math.max(rect.top,0) }}/>

        {/* bottom strip */}
        <div
        style={{
            ...strip,
            top: rect.top + rect.height,
            left:0,
            right:0,
            bottom:0,
        }}
        />

        {/* targets row left strip */}
        <div
        style={{
            ...strip,
            top: rect.top,
            left:0,
            width:Math.max(rect.left,0),
            height:rect.height,
        }}
        />

        {/* right strip target row */}
        <div
        style={{
            ...strip,
            top:rect.top,
            left:rect.left + rect.width,
            right:0,
            height:rect.height,
        }}
        />


        {/* thee highlight ring.THIS BETTER WORK */}
        <div
        style={{
            position:"fixed",
            top:rect.top,
            left: rect.left,
            width:rect.width,
            height:rect.height,
            borderRadius:8,
            boxShadow:"0 0 0 2px rgba(255,255,255,0.85), 0 0 16px rgba(0,0,0,0.3)",
            pointerEvents:"none",
            zIndex:Z_INDEX,


        }}
        />
        </>
    )
}

export default TourBlurOverlay