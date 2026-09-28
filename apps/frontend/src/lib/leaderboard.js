import { API_BASE_URL } from "./api"

export async function submitScore(gameId, score) {
  const res = await fetch(`${API_BASE_URL}/leaderboard/scores`, {
    method: "POST",
    credentials: "include", // auth cookies
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, score }),
  })
  if (!res.ok) {
    throw new Error("Failed to submit score")
  }
  return res.json()
}

export async function setScoreName(entryId, displayName) {
  const res = await fetch(
    `${API_BASE_URL}/leaderboard/scores/${entryId}/name`,
    {
      method: "PATCH",
      credentials: "include", // auth cookies
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName }),
    }
  )
  if (!res.ok) {
    throw new Error("Failed to save name")
  }
  return res.json()
}

export async function getTopScores(game_id, limit = 10) {
  const res = await fetch(
    `${API_BASE_URL}/leaderboard/scores/${game_id}?limit=${limit}`,
    {
      credentials: "include", // auth cookies
    }
  )
  if (!res.ok) {
    throw new Error("Failed to load leaderboard")
  }
  return res.json()
}
