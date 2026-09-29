import { useEffect, useState, useCallback, useRef } from "react"
import { Card, Label } from "../atoms"
import { getTopScores } from "@/lib/leaderboard"
import { ChevronDown } from "lucide-react"

const POLL_MS = 10000 // every 10 seconds update the leaderboard
const PREVIEW_COUNT = 3

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

function ScoreRow({ entry, rank }) {
  return (
    <li className="flex items-center gap-2 text-sm py-1 px-1.5 rounded-md odd:bg-black/10">
      <span
        className={`w-5 shrink-0 font-semibold tabular-nums ${
          RANK_STYLE[rank] ?? "text-dim"
        }`}
      >
        {rank + 1}
      </span>
      <span className="flex-1 truncate">
        {entry.display_name || "Anonymous"}
      </span>
      <span className="font-semibold tabular-nums">{entry.score}</span>
      <span className="text-[10px] text-dim/70 w-14 text-right shrink-0">
        {timeAgo(entry.created_at)}
      </span>
    </li>
  )
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
  const [loadedGameId, setLoadedGameId] = useState(null)
  const [error, setError] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const listRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const data = await getTopScores(gameId, limit)
      setScores(data)
      setLoadedGameId(gameId)
      setError(false)
    } catch {
      setError(true)
    }
  }, [gameId, limit])

  useEffect(() => {
    const timeout = setTimeout(load, 0)
    const interval = setInterval(load, POLL_MS)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [load])

  const handleCardClick = (e) => {
    if (listRef.current?.contains(e.target)) {
      return
    }
    setIsOpen((prev) => !prev)
  }

  const currentScores = loadedGameId === gameId ? scores : null

  // always show the preview scores then rest when expanded
  const preview = currentScores?.slice(0, PREVIEW_COUNT) ?? []
  const rest = currentScores?.slice(PREVIEW_COUNT) ?? []

  return (
    <Card
      variant="glass"
      const
      prev
      className={`flex flex-col !p-sm cursor-pointer hover:!scale-100 hover:!bg-transparant hover:!shadow-xl ${className}`}
      clickable={true}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between w-full mb-sm">
        <Label size="sm">{gameLabel ?? gameId} - Top Scores</Label>
        {currentScores?.length > PREVIEW_COUNT && (
          <ChevronDown
            className={`w-4 h-4 text-ink transition-transform duration-300 ease-in-out ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        )}
      </div>

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
        <>
          <ol className="flex flex-col gap-1">
            {preview.map((entry, i) => (
              <ScoreRow key={entry.id} entry={entry} rank={i} />
            ))}
          </ol>

          {rest.length > 0 && (
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-48 opacity-100 mt-1" : "max-h-0 opacity-0"
              }`}
            >
              <ol
                ref={listRef}
                className="flex flex-col gap-1 overflow-y-auto max-h-48 pr-1"
              >
                {rest.map((entry, i) => (
                  <ScoreRow
                    key={entry.id}
                    entry={entry}
                    rank={i + PREVIEW_COUNT}
                  />
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
