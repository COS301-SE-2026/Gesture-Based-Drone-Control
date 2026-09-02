export const API_BASE_URL = `http://localhost:${import.meta.env.BACKENDPORT}`

export function getWsUrl(path) {
  const url = new URL(path, API_BASE_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}

const RECOGNIZER_PATH = "/api/gestures/recognizer"

//whixh gesture recognizer the backend is currenlt using
// {mode, requested, available}
export async function fetchRecognizerMode() {
  const response = await fetch(`${API_BASE_URL}${RECOGNIZER_PATH}`)
  if (!response.ok) {
    throw new Error(`recognizer status failed ($[response.status])`)
  }
  return response.json()
}

export async function updateRecognizerMode(mode) {
  const response = await fetch(`${API_BASE_URL}${RECOGNIZER_PATH}`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ mode }),
  })
  if (!response.ok) {
    throw new Error(`recognizer switch failed (${response.status})`)
  }
  return response.json()
}
