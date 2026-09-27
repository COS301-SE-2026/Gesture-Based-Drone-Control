import {Page, WebSocketRoute} from "@playwright/test"
import {execSync} from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))

export const REPO_ROOT = path.resolve(HERE, "../../../..")
export const EVIDENCE_DIR = path.join(REPO_ROOT, "docs", "nfr", "evidence")
export const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "screenshots")
const RAW_DIR = path.join(EVIDENCE_DIR, "raw")

const FIXTURE = JSON.parse(
    fs.readFileSync(path.join(HERE, "fixtures", "gesture-frames.json"), "utf8")
) as {frames: string[]; hands: Record<string, unknown>[]}

function git(args: string): string | undefined {
    try {
        return execSync(`git ${args}`, {
            cwd: REPO_ROOT,
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim()
    } catch {
        return undefined
    }
}

function runContext(browserVersion: string) {
    const ctx: Record<string, unknown> = {
        machine: `${os.type()} ${os.arch()}, ${os.cpus().length} cores`,
        browser: `Chromium ${browserVersion}`,
        commit: (
            process.env.GITHUB_SHA ??
            git("rev-parse HEAD") ??
            "unknown"
        ).slice(0, 10),
        branch: 
        process.env.GITHUB_HEAD_REF ||
        process.env.GITHUB_REF_NAME ||
        git("rev-parse -- abbrev-ref HEAD") ||
        "unknown",
    runner: process.env.GITHUB_RUN_ID ? "github-actions" : "local",
    }
    if (process.env.GITHUB_RUN_ID) {
        const server = process.env.GITHUB_SERVER_URL ?? "https://github.com"
        ctx.ci_run = `${server}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`    }
    return ctx
}

export function emit(
    page: Page,
    id: string,
    requirement:string,
    metric:string,
    actual: unknown,
    target: unknown,
    passed: boolean,
    extra: Record<string, unknown> = {}
) {
    fs.mkdirSync(EVIDENCE_DIR, {recursive: true})
    const payload = {
        id,
        requirement,
        metric,
        actual,
        target,
        pass: passed,
        recorded_at: new Date().toISOString().replace(/\.\d+Z$/, "+00:00"),        ...runContext(page.context().browser()?.version() ?? "unknown"),
        suite: "frontend (Playwright)",
        ...extra,
    }
    fs.writeFileSync(
        path.join(EVIDENCE_DIR, `${id}.json`),
        JSON.stringify(payload, null, 2) + "\n"
    )
}

export function writeSamples(id: string, columns: Record<string, unknown[]>) {
    fs.mkdirSync(RAW_DIR, {recursive: true})
    const names = Object.keys(columns)
    const rows = Math.max(0, ...Object.values(columns).map((c) => c.length))
    const esc = (v: unknown) => {
        let s = ""
        if (typeof v === "string") s = v
        else if (typeof v === "number" || typeof v === "boolean") s = `${v}`
        else if (v !== undefined && v !== null) s = JSON.stringify(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [names.join(",")]
    for (let i=0; i < rows; i++)
        lines.push(names.map((n) => esc(columns[n][i])).join(","))
fs.writeFileSync(path.join(RAW_DIR, `${id}.csv`), lines.join("\n") + "\n")
}

export async function screenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  // JPEG keeps the committed evidence small; every run rewrites these files
  const file = path.join(SCREENSHOT_DIR, `${name}.jpg`)
  await page.screenshot({ path: file, type: "jpeg", quality: 70 })
  return `screenshots/${name}.jpg`
}

export function summarize(values: number[], digits = 2) {
  if (!values.length) return { n: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p: number) =>
    sorted[
      Math.max(
        0,
        Math.min(sorted.length - 1, Math.round((p / 100) * sorted.length) - 1)
      )
    ]
  const r = (v: number) => Number(v.toFixed(digits))
  return {
    n: values.length,
    min: r(sorted[0]),
    mean: r(values.reduce((a, b) => a + b, 0) / values.length),
    p50: r(pick(50)),
    p95: r(pick(95)),
    p99: r(pick(99)),
    max: r(sorted[sorted.length - 1]),
  }
}

// mocked backend

export interface MockOptions {
  /** frames per second pushed on /api/gestures/stream, 0 = none */
  gestureFps?: number
  /** called for every frame sent (index, send time) */
  onFrameSent?: (index: number) => void
  /** override JSON bodies for specific REST paths */
  rest?: Record<string, { status?: number; body: unknown }>
}

const DEFAULT_REST: Record<string, unknown> = {
  "/api/health": { status: "ok" },
  "/api/auth/me": {
    id: "00000000-0000-0000-0000-000000000001",
    email: "operator@example.com",
    first_name: "Operator",
    last_name: "NFR",
  },
  "/api/calibration/status": {
    status: "completed",
    is_calibrated: true,
    progress: null,
  },
  "/api/gestures/recognizer": {
    mode: "ml",
    requested: "ml",
    available: ["rule", "ml"],
  },
  "/api/gestures/status": {
    running: true,
    connected_clients: 1,
    last_error: null,
  },
  "/api/drone/connect": {
    connected: true,
    adapter: "dummy",
    message: "Connected",
  },
  "/api/drone/disconnect": { success: true, message: "disconnected" },
  "/api/drone/status": { connected: true, adapter: "dummy" },
  "/api/input/status": { connected: false, adapter: "None connected" },
  "/api/input/gesture/events": { events: [] },
  "/api/analytics/summary": {
    total_flights: 12,
    avg_speed: 1.8,
    max_altitude: 9.5,
    avg_flight_duration_min: 4.2,
  },
  "/api/analytics/flights": [],
}

export async function mockBackend(page: Page, opts: MockOptions = {}) {
  await page.addInitScript(() => {
    localStorage.setItem("camera-consent", "granted")
    localStorage.setItem("authToken", "nfr")
  })

  await page.route(
    /^https?:\/\/(localhost|127\.0\.0\.1):3001\//,
    async (route) => {
      const url = new URL(route.request().url())
      const override = opts.rest?.[url.pathname]
      const body = override?.body ?? DEFAULT_REST[url.pathname] ?? {}
      await route.fulfill({
        status: override?.status ?? 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "http://localhost:4173",
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify(body),
      })
    }
  )

  let flying = false
  const telemetry = () => ({
    altitude_m: flying ? 1.5 : 0,
    speed_ms: flying ? 1.2 : 0,
    battery_pct: 88,
    heading_deg: 0,
    is_flying: flying,
    x_displacement: 0,
    y_displacement: 0,
    source: "dummy",
    extra: { signal: 92 },
  })

  const timers: NodeJS.Timeout[] = []
  let stopped = false
  await page.routeWebSocket(
    /^wss?:\/\/(localhost|127\.0\.0\.1):3001\//,
    (ws: WebSocketRoute) => {
      const url = new URL(ws.url())

      if (
        url.pathname === "/api/gestures/stream" &&
        (opts.gestureFps ?? 0) > 0
      ) {
        let i = 0
        const period = 1000 / (opts.gestureFps as number)
        const started = Date.now()
        const tick = () => {
          if (stopped) return
          const hand = FIXTURE.hands[i % FIXTURE.hands.length]
          ws.send(
            JSON.stringify({
              type: "gesture_frame",
              frame_index: i,
              timestamp: i / (opts.gestureFps as number),
              fps: opts.gestureFps,
              frame_jpeg: FIXTURE.frames[i % FIXTURE.frames.length],
              frame_width: 640,
              frame_height: 480,
              hands: [hand],
            })
          )
          opts.onFrameSent?.(i)
          i += 1
          // schedule against the start time so the rate does not drift
          timers.push(
            setTimeout(tick, Math.max(0, started + i * period - Date.now()))
          )
        }
        tick()
      } else if (url.pathname === "/api/drone/ws/telemetry") {
        timers.push(
          setInterval(() => ws.send(JSON.stringify(telemetry())), 100)
        )
      } else if (url.pathname === "/api/drone/ws/commands") {
        ws.onMessage((raw) => {
          const msg = JSON.parse(String(raw)) as {
            command?: string
            source?: string
          }
          if (msg.command === "TAKEOFF") flying = true
          if (msg.command === "LAND" || msg.command === "EMERGENCY_STOP")
            flying = false
          ws.send(
            JSON.stringify({
              ok: true,
              command: msg.command,
              source: msg.source,
            })
          )
        })
      } else if (url.pathname === "/api/input/ws/gesture/events") {
        ws.send(JSON.stringify({ type: "gesture_event_history", events: [] }))
      }
      // anything else accepted and silent
    }
  )

  return {
    stop: () => {
      stopped = true
      timers.forEach((t) => clearTimeout(t))
    },
    isFlying: () => flying,
  }
}
