import { app, BrowserWindow } from "electron"
import { spawn, execFileSync } from "child_process"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let backendProcess
let mainWindow
let backendKilled = false

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

function killBackend() {
  if (backendKilled || !backendProcess) {
    return
  }
  backendKilled = true

  const pid = backendProcess.pid

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
      })
    } catch {
      /*if this throws an exception the kill was already confirmed*/
    }
  } else {
    try {
      process.kill(-pid, "SIGTERM")

      setTimeout(() => {
        try {
          process.kill(-pid, "SIGKILL")
        } catch {
          /*if this throws an exception the kill was already confirmed*/
        }
      }, 3000).unref()
    } catch {
      /*if this throws an exception the kill was already confirmed*/
    }
  }
}

app.whenReady().then(async () => {
  startBackend()
  await waitForBackend()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin"){
    app.quit()
  }
})

app.on("before-quit", killBackend)
app.on("will-quit", killBackend)
process.on("exit", killBackend)
process.on("SIGINT", () => {
  killBackend()
  process.exit(0)
})
process.on("SIGTERM", () => {
  killBackend()
  process.exit(0)
})
process.on("uncaughtException", (err) => {
  console.error(err)
  killBackend()
  process.exit(1)
})
