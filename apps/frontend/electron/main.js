import { app, BrowserWindow } from "electron"
import { spawn, execFileSync } from "child_process"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// how long the backend gets to exit on its own before we SIGKILL it.
// must stay longer than uvicorn's timeout_graceful_shutdown (apps/backend/app/main.py)
// so a clean shutdown wins the race and cv2 gets to release the webcam properly
const BACKEND_KILL_DEADLINE_MS = 6000

let backendProcess
let backendExited = false
let mainWindow
let quitting = false

function getOrCreateSecret() {
  const secretPath = path.join(app.getPath("userData"), ".secret")
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, "utf-8")
  const secret = crypto.randomBytes(32).toString("hex")
  fs.writeFileSync(secretPath, secret, { mode: 0o600 })
  return secret
}

function startBackend() {
  const backendName = process.platform === "win32" ? "backend.exe" : "backend"
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend", backendName)
    : path.join(__dirname, "../../../dist", backendName)

  backendProcess = spawn(backendPath, [], {
    detached: process.platform !== "win32",
    stdio: ["pipe", "inherit", "inherit"],
    env: { ...process.env, JWT_SECRET_KEY: getOrCreateSecret() },
  })

  backendExited = false
  backendProcess.on("exit", () => {
    backendExited = true
  })
}

function backendAlive() {
  return Boolean(backendProcess) && !backendExited
}

function signalBackend(signal) {
  if (!backendAlive()) return

  const pid = backendProcess.pid

  try {
    if (process.platform === "win32") {
      execFileSync(
        "taskkill",
        ["/pid", String(pid), "/T", "/F"], //NOSONAR
        {
          stdio: "ignore",
        }
      )
    } else {
      // negative pid targets the whole process group. the backend is spawned
      // detached so it leads its own group, which covers both the pyinstaller
      // bootloader and the python child it forks
      process.kill(-pid, signal)
    }
  } catch {
    /*if this throws an exception the kill was already confirmed*/
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { contextIsolation: true },
  })

  const indexPath = path.join(__dirname, "../dist/index.html")

  mainWindow.loadFile(indexPath)
}

async function waitForBackend() {
  while (true) {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/health")

      if (res.ok) {
        return
      }
    } catch {
      // backend not ready loop must continue
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

app.whenReady().then(async () => {
  startBackend()
  await waitForBackend()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// electron must not exit before the backend is confirmed dead
app.on("before-quit", (event) => {
  if (quitting || !backendAlive()) return

  quitting = true
  event.preventDefault()

  let killTimer
  let finished = false

  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(killTimer)
    app.exit(0)
  }

  backendProcess.once("exit", finish)

  killTimer = setTimeout(() => {
    signalBackend("SIGKILL")
    setTimeout(finish, 250)
  }, BACKEND_KILL_DEADLINE_MS)

  signalBackend("SIGTERM")
})

// last resort. 'exit' handlers must be synchronous, so no timers or graceful pass here
process.on("exit", () => signalBackend("SIGKILL"))

// route signals through app.quit() so they take the graceful path above
process.on("SIGINT", () => app.quit())
process.on("SIGTERM", () => app.quit())
process.on("SIGHUP", () => app.quit())
process.on("uncaughtException", (err) => {
  console.error(err)
  signalBackend("SIGKILL")
  process.exit(1)
})
