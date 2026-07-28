import { app, BrowserWindow } from "electron"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let backendProcess
let mainWindow

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
    stdio: "inherit",
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

app.whenReady().then(async () => {
  startBackend()
  await waitForBackend()
  createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  if (backendProcess) backendProcess.kill()
})
