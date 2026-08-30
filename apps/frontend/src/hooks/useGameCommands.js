import { useEffect, useRef } from "react";
import { getWsUrl } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";

/**
 * subscribes to the game command websocket and calls the handler there 
 * when a command arrives from the backend
 * 
 * called once inside a game scene setup function
 * the websocket persists for the lifetime of the react component that 
 * mounts the hook, so it should die after the game page is swapped
 * 
 * onCommand called with the parsed message on every command chucked our
 * way from the backend. this then gets sent to the game to actually deal with
 */

export function useGameCommands(
    onCommand,
    wsUrl = getWsUrl("api/game/ws/commands")
) {
    const onCommandRef = useRef(onCommand)
    useEffect(() => {
        onCommandRef.current = onCommand
    })

    const { status } = useWebSocket(wsUrl, {
        onMessage(event) {
            try {
                const msg = JSON.parse(event.data)
                onCommandRef.current?.(msg)
            } catch (err) {
                console.error("useGameCommands: failed to parse message", err)
            }
        },
    })
    return { status }
}