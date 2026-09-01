import { useState, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, Label } from "../atoms"
import { GestureCameraFeed } from "../molecules"
import { useKeyboardControl } from "@/hooks/useKeyboardControl"
import { useGamepadControl } from "@/hooks/useGamepadControl"
import { useGestureControl } from "@/hooks/useGestureControl"
import FlappyDroneGame from "./FlappyDroneGame"

const INPUT_ADAPTERS = ["keyboard", "gamepad", "gesture"]

const Games = () => {
  const [gameActive, setGameActive] = useState(false)
  const [input, setInput] = useState("keyboard")
  // uses the same sort of thing that we have to show connection status. just shittier
  const [status, setStatus] = useState("disconnected")
  const [error, setError] = useState("")

  // only active when the game is active and matching input is selected
  const { connected: kbConnected } = useKeyboardControl(
    gameActive && input === "keyboard"
  )
  const { connected: gpConnected } = useGamepadControl(
    gameActive && input === "gamepad"
  )
  const { connected: gsConnected } = useGestureControl(
    gameActive && input === "gesture"
  )

  const inputConnected =
    (input === "keyboard" && kbConnected) ||
    (input === "gamepad" && gpConnected) ||
    (input === "gesture" && gsConnected)

  const start = useCallback(async () => {
    setError("")
    setStatus("connecting")

    try {
      // connect to the game adapter with the existing drone endpoint
      const drone = await fetch(`${API_BASE_URL}/api/game/connect`, {
        method: "POST",
      })
      const data = await drone.json()
      if (!data.active) {
        setStatus("failed")
        setError(data.message || "connection failed")
        return
      }
      // made it through
      setStatus("connected")
      setGameActive(true)
    } catch (err) {
      setStatus("failed")
      setError(String(err))
    }
  }, [])

  const stop = useCallback(async () => {
    setGameActive(false)
    setStatus("disconnected")
    await fetch(`${API_BASE_URL}/api/game/disconnect`, {
      method: "POST",
    }).catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* controls row */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={gameActive}
        >
          {INPUT_ADAPTERS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <button onClick={gameActive ? stop : start}>
          {gameActive ? "Stop" : "Start"}
        </button>

        {/* status indicators */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500"
                  : status === "failed"
                    ? "bg-red-500"
                    : "bg-Grey/40"
            }`}
          />
          <span>game: {status}</span>
        </div>

        {gameActive && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2  ${
                inputConnected ? "bg-green-500" : "bg-Grey/40"
              }`}
            />
            <span>input: {inputConnected ? "active" : "connecting..."}</span>
          </div>
        )}

        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {/* game and camera are in the same row*/}
      <div className="flex gap-6 items-start">
        <div className="w-[1064px] shrink-0">
          <FlappyDroneGame />
        </div>

        {/* camera feed thats only shown when the gestures adapter is selected */}
        {input === "gesture" && (
          <Card variant="glass" className="flex-1">
            <Label size="sm" className="mb-3">
              Gesture Feed
            </Label>
            <GestureCameraFeed className="flex-1" />
          </Card>
        )}
      </div>
    </div>
  )
}

export default Games
