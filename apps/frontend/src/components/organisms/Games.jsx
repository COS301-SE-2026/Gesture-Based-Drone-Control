import { useState, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, Label } from "../atoms"
import { GestureCameraFeed } from "../molecules"
import { useKeyboardControl } from "@/hooks/useKeyboardControl"
import { useGamepadControl } from "@/hooks/useGamepadControl"
import { useGestureControl } from "@/hooks/useGestureControl"

import FlappyDroneGame from "./FlappyDroneGame"
import DebugGame from "./DebugGame"

const GAMES = [
  { id: "flappy", label: "Flappy Drone", component: FlappyDroneGame },
  { id: "debug", label: "Debug", component: DebugGame },
]

const INPUT_ADAPTERS = [
  { id: "keyboard", label: "Keyboard" },
  { id: "gamepad", label: "Gamepad" },
  { id: "gesture", label: "Gesture" },
]
const STATUS_DOT = {
  connected: "bg-[var(--red)] shadow-[0_0_8px_var(--glow)]",
  connecting: "bg-[var(--red)] animate-glow-pulse",
  failed: "bg-red-500",
  disconnected: "bg-dim/40",
}

function StatusDot({ status }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        STATUS_DOT[status] ?? STATUS_DOT.disconnected
      }`}
    />
  )
}

function Segmented({ options, value, onChange, disabled }) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-md bg-black/20 border border-glassBrd ${
        disabled ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1 rounded-[6px] text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors duration-200 ${
              active
                ? "bg-[var(--red)] text-white shadow-[0_0_10px_var(--glow)]"
                : "text-dim hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const Games = () => {
  const [gameActive, setGameActive] = useState(false)
  const [input, setInput] = useState("gesture")
  const [selectedGame, setSelectedGame] = useState("flappy")
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

  const ActiveGame = GAMES.find((g) => g.id === selectedGame)?.component ?? null

  return (
    <div className="p-lg space-y-sm font-mono text-ink">
      {/* toolbar*/}
      <Card
        variant="glass"
        className="flex items-center gap-lg flex-wrap !p-sm"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Game</Label>
          <Segmented
            options={GAMES.map((g) => ({ id: g.id, label: g.label }))}
            value={selectedGame}
            onChange={setSelectedGame}
            disabled={gameActive}
          />
        </div>

        <div className="w-px self-stretch bg-line" />

        <div className="flex flex-col gap-1.5">
          <Label>Input</Label>
          <Segmented
            options={INPUT_ADAPTERS}
            value={input}
            onChange={setInput}
            disabled={gameActive}
          />
        </div>

        <div className="w-px self-stretch bg-line" />

        <button
          onClick={gameActive ? stop : start}
          className={`self-end px-lg py-2 rounded-md font-display font-semibold text-sm uppercase tracking-wide transition-all duration-200 ${
            gameActive
              ? "bg-transparent border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red)]/10"
              : "bg-[var(--red)] text-white hover:shadow-[0_0_20px_var(--glow)]"
          }`}
        >
          {gameActive ? "Stop" : "Start"}
        </button>

        <div className="flex items-center gap-lg ml-auto self-end pb-1">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <Label> Game: {status}</Label>
          </div>

          {gameActive && (
            <div className="flex items-center gap-2">
              <StatusDot status={inputConnected ? "connected" : "connecting"} />
              <Label> Input: {inputConnected ? "active" : "connecting"}</Label>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="text-xs font-mono text-[var(--red)] bg-[var(--red-shadow)] border border-[var(--red-deep)] rounded-md px-sm py-2">
          {error}
        </div>
      )}

      {/* main content */}
      <div className="flex gap-md items-start">
        <Card variant="glass" className="flex-1 !p-0 overflow-hidden">
          {ActiveGame ? (
            <ActiveGame />
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <Label>No game selected</Label>
            </div>
          )}
        </Card>

        {input === "gesture" && (
          <Card variant="glass" className="flex-1 flex flex-col">
            <Label size="sm" className="mb-sm">
              Gesture Feed
            </Label>
            <GestureCameraFeed className="flex-1 rounded-md overflow-hidden" />
          </Card>
        )}
      </div>
    </div>
  )
}

export default Games
