import { useEffect, useRef, useState, useCallback } from "react"

//backend port url
const DEFAULT_WS_URL = `ws://${window.location.hostname}:3001/drone/ws/telemetry`

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 1000

/**
 * opens a websocket to /drone/ws/telemetry and keeps it alive w reconnect and backoff.
 * it exposes the latest telem frame
 * 
 * quic note: the backend socket accepts the connection immediately and stays 
 * silent until that POST /drone/connect has been called and an adapter is set
 * the "open" status with telem being null means no adapter is connected yet not that the socket is broken
 */

export function useTelemetry(wsUrl = DEFAULT_WS_URL) {
    const [telem, setTelem] = useState(null)
    const [status, setStatus] = useState("connecting")
    //connecting | open | closed | error

    const socketRef = useRef(null)
    const reconnectAttemptsRef = useRef(0)
    const reconnectTimeoutRef = useRef(null)
    const isUnmountedRef = useRef(false)

    const connect = useCallback(() => {
        if (isUnmountedRef.current) return

        setStatus("connecting")
        const socket = new WebSocket(wsUrl)
        socketRef.current = socket

        socket.onopen = () => {
            if (isUnmountedRef.current) return
            reconnectAttemptsRef.current = 0
            setStatus("open")
        }

        socket.onmessage = (event) => {
            if (isUnmountedRef.current) return

            try {
                setTelem(JSON.parse(event.data))
            }
            catch (err) {
                console.error("useTelemetry: failed to parse telem frame", err)
            }
        }


    })
}