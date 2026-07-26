// apps/frontend/src/hooks/useGamepadControl.js

import { API_BASE_URL, getWsUrl } from "@/lib/api"
import { useWebSocket } from "./useWebSocket"
import { useEffect, useRef } from "react"

// adjust along with adapter as needed. done here to lower number of useless packets
const DEADZONE = 0.08

// apply deadzone to an analog axis
function cleanAxis(value) {
  if (Math.abs(value) < DEADZONE) return 0
  return Number(value.toFixed(3))
}

// read the full gamepad state and package it into the  GamepadAdapter schema
function readGamepad(pad) {
  return {
    left_x: cleanAxis(pad.axes[0]), //right==1, ,left==-1
    left_y: cleanAxis(pad.axes[1]), //down==1, up==-1

    right_x: cleanAxis(pad.axes[2]),
    right_y: cleanAxis(pad.axes[3]),
    //fully depressed == 1
    ltrigger: Number((pad.buttons[6]?.value || 0).toFixed(3)),
    rtrigger: Number((pad.buttons[7]?.value || 0).toFixed(3)),

    a: pad.buttons[0]?.pressed || false, //x
    b: pad.buttons[1]?.pressed || false, //o
    x: pad.buttons[2]?.pressed || false, //square
    y: pad.buttons[3]?.pressed || false, //triangle

    lb: pad.buttons[4]?.pressed || false,
    rb: pad.buttons[5]?.pressed || false,

    back: pad.buttons[8]?.pressed || false,
    start: pad.buttons[9]?.pressed || false,

    lclick: pad.buttons[10]?.pressed || false, //left stick click
    rclick: pad.buttons[11]?.pressed || false, //right stick click
    //dpad
    up: pad.buttons[12]?.pressed || false,
    down: pad.buttons[13]?.pressed || false,
    left: pad.buttons[14]?.pressed || false,
    right: pad.buttons[15]?.pressed || false,
  }
}

/**
 * Mirrors useKeyboardControl basically 1:1
 *
 * post to /api/input/connect
 * opens ws to /api/input/ws/gamepad
 * polls via requestAnimationFrame and sends snapshots
 * clean disconnect
 */
export function useGamepadControl(
  enabled,
  wsUrl = getWsUrl("/api/input/ws/gamepad")
) {
  const { socketRef, status } = useWebSocket(wsUrl)

  //rAF to cancel on cleanup
  const rafRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    fetch(`${API_BASE_URL}/api/input/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adapter: "gamepad" }),
    }).catch((err) =>
      console.error("useGamepadControl: failed to connect adapter", err)
    )

    return () => {
      fetch(`${API_BASE_URL}/api/input/disconnect`, {
        method: "POST",
      }).catch((err) =>
        console.error("useGamepadControl: failed to disconnect adapter", err)
      )
    }
  }, [enabled])

  // polling loop that runs only when the adapter is enabled
  // requestAnimationFrame running at about 60hz
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const poll = () => {
      if (cancelled) return

      // skip polling when the tab is not visible
      if (!document.hidden) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : []
        const pad = Array.from(pads).find((p) => p && p.connected)
        const socket = socketRef.current

        // make sure we good then send the entire state over WS
        if (pad && socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(readGamepad(pad)))
        }
      }
      // the recursionish loop
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)

    return () => {
      cancelled = true
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled, socketRef])

  return {
    connected: status === "open",
    status,
  }
}
