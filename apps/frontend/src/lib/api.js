export const API_BASE_URL = `http://localhost:${import.meta.env.BACKENDPORT}`

export function getWsUrl(path) {
  const url = new URL(path, API_BASE_URL)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}
