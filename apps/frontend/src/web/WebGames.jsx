import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, Label } from "@/components/atoms"
import GameControlGuide from "@/components/molecules/GameControlGuide.jsx"
import { useKeyboardControl } from "@/hooks/useKeyboardControl"
import { useGamepadControl } from "@/hooks/useGamepadControl"
import { useDebug } from "@/context/DebugContext"
import FlappyDroneGame from "@/components/organisms/FlappyDroneGame"
import PacDroneGame from "@/components/organisms/PacDroneGame"
import DebugGame from "@/components/organisms/DebugGame"
import NightWatchGame from "@/components/organisms/NightWatchGame"

/**
 * Web demo version of the Games page (desktop: components/organisms/Games.jsx).
 *
 * Same games and the same keyboard/gamepad hooks; the differences are:
 *  - no gesture input or camera feed (no camera on the hosted demo)
 *  - no leaderboard (it is tied to user accounts, which the demo does not have)
 */

const GAMES = [
  { id: "flappy", label: "Flappy Drone", component: FlappyDroneGame },
  { id: "pacman", label: "Pac-Drone", component: PacDroneGame },
  { id: "nightwatch", label: "NightWatch", component: NightWatchGame },
  { id: "debug", label: "Debug", component: DebugGame },
]

const INPUT_ADAPTERS = [
  { id: "keyboard", label: "Keyboard" },
  { id: "gamepad", label: "Gamepad" },
]

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

const WebGames = () => {
  const { debugMode } = useDebug()
  const [gameActive, setGameActive] = useState(false)
  const [input, setInput] = useState("keyboard")
  const [selectedGame, setSelectedGame] = useState("flappy")
  const [status, setStatus] = useState("disconnected")
  const [error, setError] = useState("")

  const { connected: kbConnected } = useKeyboardControl(
    gameActive && input === "keyboard"
  )
  const { connected: gpConnected } = useGamepadControl(
    gameActive && input === "gamepad"
  )

  const inputConnected =
    (input === "keyboard" && kbConnected) ||
    (input === "gamepad" && gpConnected)

  const start = useCallback(async () => {
    setError("")
    setStatus("connecting")
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/connect`, {
        method: "POST",
      })
      if (res.status === 503) {
        setStatus("failed")
        setError("The demo is busy right now, please try again in a moment.")
        return
      }
      const data = await res.json()
      if (!data.active) {
        setStatus("failed")
        setError(data.message || "connection failed")
        return
      }
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

  // automatically start when the page mounts, disconnect when leaving
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    start()
    return () => {
      fetch(`${API_BASE_URL}/api/game/disconnect`, { method: "POST" }).catch(
        () => {}
      )
    }
  }, [start])

  const visibleGames = useMemo(
    () => GAMES.filter((g) => g.id !== "debug" || debugMode),
    [debugMode]
  )
  const activeGameId = visibleGames.some((g) => g.id === selectedGame)
    ? selectedGame
    : visibleGames[0].id
  const activeGame = visibleGames.find((g) => g.id === activeGameId)
  const ActiveGame = activeGame?.component ?? null

  return (
    <div className="p-lg gap-sm font-mono text-ink flex flex-col">
      <Card
        variant="glass"
        className="flex items-center gap-lg flex-wrap !p-sm shrink-0"
      >
        <div className="flex flex-col gap-1.5">
          <Label>Game</Label>
          <Segmented
            options={visibleGames.map((g) => ({ id: g.id, label: g.label }))}
            value={activeGameId}
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
      </Card>

      {error && (
        <div className="text-xs font-mono text-[var(--red)] bg-[var(--red-shadow)] border border-[var(--red-deep)] rounded-md px-sm py-2">
          {error}
        </div>
      )}

      <div className="flex gap-md h-[calc(100dvh-13rem)] min-h-[420px]">
        <Card
          variant="glass"
          className="relative flex-1 basis-0 min-w-0 min-h-0 !p-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ containerType: "size" }}
          >
            <div
              style={{
                width: "min(100cqw, calc(100cqh * 16 / 9))",
                aspectRatio: "16 /9",
              }}
            >
              {ActiveGame ? (
                <ActiveGame
                  status={status}
                  inputConnected={inputConnected}
                  gameActive={gameActive}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Label>No game selected</Label>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <GameControlGuide activeInput={input} />
    </div>
  )
}

export default WebGames
