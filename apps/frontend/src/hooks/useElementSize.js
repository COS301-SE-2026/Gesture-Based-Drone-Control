import {useEffect, useRef, useState} from "react"

export function useElementSize(){
    const ref = useRef(null)
    const [size, setSize] = useState({width: 0, height: 0})

    useEffect( () => {
        const el = ref.current
        if (!el) return undefined

        const update = () =>
            setSize({width: el.clientWidth, height: el.clientHeight})

        update()

        if (!("ResizeObserver" in window)){
            window.addEventListener("resize", update)
            return () => window.removeEventListener("resize", update)
        }

        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
}