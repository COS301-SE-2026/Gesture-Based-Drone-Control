import {useEffect, useRef, useState} from "react"
import {API_BASE_URL} from "../lib/api"

function buildWsUrl(path){
    const wsBase = API_BASE_URL.replace(/^http/,"ws")
    return `${wsBase}${path}`
}

export function useGestureStream(){
    const [frame,setFrame]=useState(null)
    const[connected,setConnected]=useState(false)
    const wsRef = useRef(null)

    useEffect(()=>{
        let cancelled = false
        const ws =new WebSocket(buildWsUrl("/api/gestures/stream"))
        wsRef.current=ws

        ws.onopen=() => { if(!cancelled) setConnected(true) } 
        ws.onclose=()=>  { if(!cancelled) setConnected(false) } 
        ws.onerror=()=>  { if(!cancelled) setConnected(false) } 

        ws.onmessage=(event)=>{
            if(cancelled) return
            try{
                setFrame(JSON.parse(event.data))
            }
            catch{
                //well if the frame is wonky then just ignore it man...
            }
        }

        return()=>
        {
            cancelled = true
            wsRef.current = null
            // never closes socket that still handshaking (strict mode mounts/unmount/remount in dev)
            if(ws.readyState === WebSocket.OPEN) {
                ws.close()
            } else if(ws.readyState === WebSocket.CONNECTING){
                ws.addEventListener("open", () => ws.close(), {once:true})
            }
        }
    
    },[])

    return {frame,connected}
}