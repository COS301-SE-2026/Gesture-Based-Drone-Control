import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { API_BASE_URL } from "@/lib/api"
import { Card, Label } from "../atoms"
import { GestureCameraFeed, GameControlGuide } from "../molecules"
import { useKeyboardControl } from "@/hooks/useKeyboardControl"
import { useGamepadControl } from "@/hooks/useGamepadControl"
import { useGestureControl } from "@/hooks/useGestureControl"
import { useDebug } from "@/context/DebugContext"
import { LeaderboardPanel } from "../molecules/LeaderboardPanel"

import FlappyDroneGame from "./FlappyDroneGame"
import PacDroneGame from "./PacDroneGame"
import DebugGame from "./DebugGame"
import NightWatchGame from "./NightWatchGame"

const GAMES = [
  { id: "flappy", label: "Flappy Drone", component: FlappyDroneGame },
  { id: "pacman", label: "Pac-Drone", component: PacDroneGame },
  { id: "nightwatch", label: "NightWatch", component: NightWatchGame },
  { id: "debug", label: "Debug", component: DebugGame },
]

const INPUT_ADAPTERS = [
  { id: "keyboard", label: "Keyboard" },
  { id: "gamepad", label: "Gamepad" },
  { id: "gesture", label: "Gesture" },
]
// const STATUS_DOT = {
//   connected: "bg-[var(--red)] shadow-[0_0_8px_var(--glow)]",
//   connecting: "bg-[var(--red)] animate-glow-pulse",
//   failed: "bg-red-500",
//   disconnected: "bg-dim/40",
// }

// function StatusDot({ status }) {
//   return (
//     <span
//       className={`inline-block w-1.5 h-1.5 rounded-full ${
//         STATUS_DOT[status] ?? STATUS_DOT.disconnected
//       }`}
//     />
//   )
// }

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
  const { debugMode } = useDebug()
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

  // automatically start the input pipeline when the page mounts
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) {
      return
    }
    startedRef.current = true
    start()

    // disconnect when leaving the page
    return () => {
      fetch(`${API_BASE_URL}/api/game/disconnect`, { method: "POST" }).catch(
        () => {}
      )
    }
  }, [start])

  //debug game moved to debug mode
  const visibleGames = useMemo(
    () => GAMES.filter((g) => g.id !== "debug" || debugMode),
    [debugMode]
  )
  const activeGameId = visibleGames.some((g) => g.id === selectedGame)
    ? selectedGame
    : visibleGames[0].id
  const activeGame = visibleGames.find((g) => g.id === activeGameId)
  const ActiveGame = activeGame?.component ?? null

  const showGesture = input === "gesture"

  return (
    <div className="p-lg gap-sm font-mono text-ink flex flex-col">
      {/* toolbar*/}
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

        {/* <div className="flex items-center gap-lg ml-auto self-end pb-1">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <Label> Game: {status}</Label>
          </div>

          {gameActive && (
            <div className="flex items-center gap-2">
              <StatusDot status={inputConnected ? "connected" : "connecting"} />
              <Label> Input: {inputConnected ? "active" : "connecting"}</Label>
            </div>
          )} */}
        {/* </div> */}
      </Card>

      {error && (
        <div className="text-xs font-mono text-[var(--red)] bg-[var(--red-shadow)] border border-[var(--red-deep)] rounded-md px-sm py-2">
          {error}
        </div>
      )}

      {/* main content */}

      <div
        className={`flex gap-md ${
          showGesture ? "" : "h-[calc(100dvh-13rem)] min-h-[420px]"
        }`}
      >
        <Card
          variant="glass"
          className={`relative flex-1 basis-0 min-w-0 min-h-0 !p-0 overflow-hidden ${
            showGesture ? "aspect-video" : ""
          }`}
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

        {showGesture && (
          <Card
            variant="glass"
            className="flex-1 basis-0 min-w-0 flex flex-col"
          >
            <Label size="sm" className="mb-sm shrink-0">
              Gesture Feed
            </Label>
            <GestureCameraFeed className="flex-1 min-h-0 rounded-md overflow-hidden" />
          </Card>
        )}
      </div>

      <div className="flex gap-md items-start">
        <div className="flex-1 basis-0 min-w-0">
          <LeaderboardPanel
            gameId={activeGameId}
            gameLabel={activeGame?.label}
          />
        </div>
        <div className="flex-1 basis-0 min-w-0">
          <GameControlGuide activeInput={input} />
        </div>
      </div>
    </div>
  )
}

export default Games
