import { useEffect, useRef } from "react";
import { API_BASE_URL, getWsUrl } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useGestureControl } from "./useGestureControl";

const RECOVER_DELAY_MS = 800
const MAX_RECOVER = 3

export function useGestureCommands(
    onCommand,
    wsUrl = getWsUrl("/api/input/ws/gesture/events")
){
    const handlerRef = useRef(onCommand)
    const lastIdRef = useRef(null)

    useEffect( () => {
        handlerRef.current = onCommand
    })

    const {connected, status: adapter } = useGestureControl(true)

    const everLiveRef = useRef(false)
    const recoveriesRef = useRef(0)

    useEffect( () => {

        if (adapter.active){
            everLiveRef.current = true
            recoveriesRef.current =0
            return undefined
        }

        if (!everLiveRef.current) return undefined

        if (recoveriesRef.current >= MAX_RECOVER) return undefined

        const timer = setTimeout( () => {

            recoveriesRef.current += 1

            fetch (`${API_BASE_URL}/api/input/connect`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({adapter: "gesture"}),
            }).catch((err) => {
                console.error("useGestureCommand: adapter recovery failed, " +err)
            })
        }, RECOVER_DELAY_MS)

        return () => clearTimeout(timer)
    }, [adapter.active])

    const { status } = useWebSocket(wsUrl, {
        onMessage: (message) => {
            let payload
            try {
                payload = JSON.parse(message.data)
            }catch (err){
                console.error("useGestureCommands: failed to parse event " +err)
                return
            }
            if (payload.type !== "gesture_event") return
            if (payload.id === lastIdRef.current)return

            lastIdRef.current = payload.id
            handlerRef.current?.(payload)
        }
    })

    return { live: status === "open" && adapter.active, status, connected, adapter }
}