import { useEffect, useCallback, useState } from "react"
import { API_BASE_URL, getWsUrl } from "../lib/api"
import { useWebSocket } from "./useWebSocket"

export function useKeyboardControl(
  enabled,
  onMessage,
  wsUrl = getWsUrl("/api/input/ws/keyboard")
) {
  const { socketRef, status } = useWebSocket(wsUrl)

  // helper to actually send the req to be processed
  const send = useCallback(
    (payload) => {
      const socket = socketRef.current

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false
      }

      try {
        socket.send(JSON.stringify(payload))
        onMessage(payload)
      } finally {
        return true
      }
    
    },
    [socketRef, onMessage]
  )


  useEffect(() => {
    if (!enabled) return

    fetch(`${API_BASE_URL}/api/input/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adapter: "keyboard",
      }),
    }).catch((err) =>
      console.error("useKeyboardControl: failed to connect adapter", err)
    )

    return () => {
      fetch(`${API_BASE_URL}/api/input/disconnect`, {
        method: "POST",
      }).catch((err) =>
        console.error("useKeyboardControl: failed to disconnect adapter", err)
      )
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return


    const CONTROL_KEYS = new Set([
      "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
      " ","Spacebar",
      "w","a","s","d",
      "t","l",
      "Escape",
    ])

    // keydown events are actually handled
    // send them as they come, hold down means continuous input
    const handleKeyDown = (e) => {
      send({
        key: e.key,
        event: "keydown",
      })
    }

    // keyup dont do anything yet
    // const handleKeyUp = (e) => {
    //   send({
    //     key: e.key,
    //     event: "keyup",
    //   })
    // }

    window.addEventListener("keydown", handleKeyDown)
    // window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      // window.removeEventListener("keyup", handleKeyUp)
    }
  }, [enabled, send])

  return {
    connected: status === "open",
    status,
  }
}
