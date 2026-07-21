import {useEffect, useRef,useState,useCallback} from "resct"
import{API_BASE_URL} from "../lib/api"

const RECONNECT_DELAY_MS =2000
const WS_BASE_URL = API_BASE_URL.replace(/^http/,"ws")


export function useKeyboardControl(enabled){
    const wsRef = useRef(null)
    const reconnectTimer = useRef(null)
    const [connected,setConnected] = useState(false)

    const send = useCallback((payload) => {
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload))
        }
    },[])


    useEffect(() =>{
        if(!enabled)
        {
            return
        }

        let cancelled = false
        const connectAdapter = async() => {
            try
            {
                await fetch(`${API_BASE_URL}/input/connect`,{
                    method:"POST",
                    headers: {"Content-Type" : "application/json"},
                    body: JSON.stringify({adapter: "keyboard"}),
                })
            }

            catch(err)
            {
                console.error("useKeyboardControl: failed to connect adapter",err)
            }
        }

        connectAdapter()

        return() => {
            if(cancelled)
            {
                return
            }

            fetch(`${API_BASE_URL}/input/disconnect`,{method:"POST"}).catch(
            (err)=> console.error("useKeyboardControl: failed to connevct adapter", err)
            )
        }
    },[enabled])
}