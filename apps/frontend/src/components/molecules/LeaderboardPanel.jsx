import { useEffect, useState, useCallback } from "react"
import { Card, Label } from "../atoms"
import { getTopScores } from "@/lib/leaderboard"

const POLL_MS = 10000 // every 10 seconds update the leaderboard

// top 3 different colour
const RANK_STYLE = {
  0: "text-[var(--red)]",
  1: "text-ink",
  2: "text-dim",
}

// helper to show how long ago a score was submitted
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// show the top n scores for a single game
// polls in the background to stay up to date
export function LeaderboardPanel({
  gameId,
  gameLabel,
  limit = 50,
  className = "",
}) {
  const [scores, setScores] = useState(null) // null = loading, [] = loaded empty
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getTopScores(gameId, limit)
      setScores(data)
      setError(false)
    } catch {
      setError(true)
    }
  }, [gameId, limit])

  useEffect(() => {
    setScores(null) // will show a loading state when switching games
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  return (
    <Card variant="glass" className={`flex flex-col !p-sm ${className}`}>
      <Label size="sm" className="mb-sm">
        {gameLabel ?? gameId} - Top Scores
      </Label>

      {error && (
        <Label size="sm" className="text-[var(--red)]">
          Can't load leaderboard
        </Label>
      )}

      {!error && scores === null && (
        <Label size="sm" className="text-dim">
          Loading…
        </Label>
      )}

      {!error && scores?.length === 0 && (
        <Label size="sm" className="text-dim">
          No scores yet
        </Label>
      )}

      {!error && scores?.length > 0 && (
        <ol className="flex flex-col gap-1 overflow-y-auto max-h-72">
          {scores.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 text-sm py-1 px-1.5 rounded-md odd:bg-black/10"
            >
              <span
                className={`w-5 shrink-0 font-semibold tabular-nums ${
                  RANK_STYLE[i] ?? "text-dim"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">
                {entry.display_name || "Anonymous"}
              </span>
              <span className="font-semibold tabular-nums">{entry.score}</span>
              <span className="text-[10px] text-dim/70 w-14 text-right shrink-0">
                {timeAgo(entry.created_at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
