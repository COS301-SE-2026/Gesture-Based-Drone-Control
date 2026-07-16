import { useEffect, useRef, useState, useCallback } from "react"

//backend port url
const DEFAULT_WS_URL = `ws://${window.location.hostname}:3001/api/drone/ws/telemetry`

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 10000

/**
 * opens a websocket to /drone/ws/telemetry and keeps it alive w reconnect and backoff.
 * it exposes the latest telemetry frame
 * 
 * quic note: the backend socket accepts the connection immediately and stays 
 * silent until that POST /drone/connect has been called and an adapter is set
 * the "open" status with telemetry being null means no adapter is connected yet not that the socket is broken
 */

export function useTelemetry(wsUrl = DEFAULT_WS_URL) {
    const [telemetry, setTelemetry] = useState(null)
    const [status, setStatus] = useState("connecting")
    //connecting | open | closed | error

    const socketRef = useRef(null)
    const reconnectAttemptsRef = useRef(0)
    const reconnectTimeoutRef = useRef(null)
    const isUnmountedRef = useRef(false)

    const connectRef = useRef(null)

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
                setTelemetry(JSON.parse(event.data))
            }
            catch (err) {
                console.error("useTelemetry: failed to parse telemetry frame", err)
            }
        }

        socket.onerror = (err) => {
            console.error("useTelemetry: websoscket error", err)
            if (!isUnmountedRef.current) setStatus("error")
        }

        socket.onclose = () => {
            socketRef.current = null
            if (isUnmountedRef.current) return
            setStatus("closed")

            //exp backoff but its capped so if the backend is dead it wont spam to reconnect

            const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptsRef.current,
                MAX_RECONNECT_DELAY_MS
            )
            reconnectAttemptsRef.current += 1
            reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), delay)
        }


    }, [wsUrl])

    useEffect(() => {
        connectRef.current = connect
    }, [connect])

    useEffect(() => {
        isUnmountedRef.current = false
        connect()

        return () => {
            isUnmountedRef.current = true
            clearTimeout(reconnectTimeoutRef.current)
            socketRef.current?.close()
        }
    }, [connect])

    return { telemetry, status}
}