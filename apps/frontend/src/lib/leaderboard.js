import { API_BASE_URL } from "./api";

export async function submitScore(gameId, score) {
    const res = await fetch (`${API_BASE_URL}/leaderboard/scores`, {
        method: "POST",
        credentials: "include", // auth cookies
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({game_id: gameId, score}),
    })
    if (!res.ok){
        throw new Error("Failed to submit score")
    }
    return res.json()
}

