/**
 * Web demo only: gives every browser tab its own backend session.
 *
 * The shared hooks (useKeyboardControl, useGameCommands, ...) talk to
 * `http://localhost:<BACKENDPORT>` because that is where the desktop app's
 * bundled backend lives. The web build pins BACKENDPORT to a sentinel
 * (see vite.web.config.js) and this module, loaded before the app renders:
 *
 *  1. rewrites that sentinel origin to the site's own origin
 *     (Caddy serves the page and proxies /api on the same domain), and
 *  2. tags every API call with this tab's session id
 *        fetch     -> X-Session-Id header
 *        WebSocket -> ?sid=<id>  (browsers cannot set headers on WebSockets)
 *
 * so several laptops can use the demo at once without controlling each
 * other's games. None of this is imported by the desktop build.
 */

const STORAGE_KEY = "gbdc-web-session"
const SENTINEL = /^(https?|wss?):\/\/localhost:1(?=[/?#]|$)/

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // fallback for very old browsers
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function loadSessionId() {
  try {
    // sessionStorage is per tab and survives reloads of that tab
    let id = sessionStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = newId()
      sessionStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return newId()
  }
}

export const SESSION_ID = loadSessionId()

function rewriteHttp(url) {
  return url.replace(SENTINEL, window.location.origin)
}

function rewriteWs(url) {
  const wsOrigin = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
  const u = new URL(url.replace(SENTINEL, wsOrigin))
  if (u.host === window.location.host) u.searchParams.set("sid", SESSION_ID)
  return u.toString()
}

function isOwnApi(url) {
  try {
    const u = new URL(url, window.location.href)
    return u.origin === window.location.origin && u.pathname.startsWith("/api/")
  } catch {
    return false
  }
}

let installed = false

export function installSessionTransport() {
  if (installed) return
  installed = true

  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    if (typeof input === "string" || input instanceof URL) {
      const url = rewriteHttp(String(input))
      if (isOwnApi(url)) {
        const headers = new Headers(init.headers || {})
        headers.set("X-Session-Id", SESSION_ID)
        return nativeFetch(url, { ...init, headers })
      }
      return nativeFetch(url, init)
    }
    return nativeFetch(input, init)
  }

  const NativeWebSocket = window.WebSocket
  class SessionWebSocket extends NativeWebSocket {
    constructor(url, protocols) {
      super(rewriteWs(String(url)), protocols)
    }
  }
  window.WebSocket = SessionWebSocket
}
