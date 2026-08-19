import { it } from "node:test"
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
            

        }
    })
}