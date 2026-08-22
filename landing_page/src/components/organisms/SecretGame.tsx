import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { createDrone } from "../../lib/droneMesh"
import "./SecretGame.css"

type Phase = "boot" | "ready" | "playing" | "dead"

type SecretGameProps = {
  onExit: () => void
}

const BEST_KEY = "gbdc.nightrun.best"

const LANE_X = 8.4
const FLOOR_Y = 1.0
const CEIL_Y = 8.4
const DRONE_Z = 0
const SPAWN_Z = -170
const DESPAWN_Z = 26
const WAVE_COUNT = 10
const GATE_DEPTH = 1.5
const TILE = 5

const HX = 0.78
const HY = 0.38

function makeRng() {
  const seed = new Uint32Array(1)
  crypto.getRandomValues(seed)
  let a = seed[0]
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(value: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(value)))
  } catch {
    // private mode ignore
  }
}

function makeGridTexture() {
  const c = document.createElement("canvas")
  c.width = 128
  c.height = 128
  const ctx = c.getContext("2d")
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128)
    ctx.strokeStyle = "#ff2f4d"
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, 128, 128)
    ctx.strokeStyle = "rgba(255, 80, 110, 0.35)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(64, 0)
    ctx.lineTo(64, 128)
    ctx.moveTo(0, 64)
    ctx.lineTo(128, 64)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

function makeSunTexture() {
  const size = 512
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, size)
    g.addColorStop(0, "#ffd166")
    g.addColorStop(0.42, "#ff7b3d")
    g.addColorStop(0.72, "#e5383b")
    g.addColorStop(1, "#7a0b18")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalCompositeOperation = "destination-out"
    let y = size * 0.54
    let band = 3
    while (y < size) {
      ctx.fillRect(0, y, size, band)
      y += band + Math.max(4, 22 - band * 2)
      band += 2.2
    }
  }
  return new THREE.CanvasTexture(c)
}

type Slab = {
  root: THREE.Group
  cx: number
  cy: number
  w: number
  h: number
}

type Wave = {
  root: THREE.Group
  slabs: Slab[]
  core: THREE.Mesh
  z: number
  active: boolean
  scored: boolean
  coreAlive: boolean
}

export default function SecretGame({ onExit }: SecretGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const scoreRef = useRef<HTMLSpanElement | null>(null)
  const speedRef = useRef<HTMLSpanElement | null>(null)
  const gateRef = useRef<HTMLSpanElement | null>(null)
  const apiRef = useRef<{ start: () => void }>({ start: () => {} })
  const phaseRef = useRef<Phase>("boot")
  const exitRef = useRef(onExit)

  const [phase, setPhase] = useState<Phase>("boot")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)
  const bestRef = useRef(best)

  useEffect(() => {
    exitRef.current = onExit
  }, [onExit])

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("ready"), 1500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleStart = useCallback(() => apiRef.current.start(), [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const rng = makeRng()
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x14030f, 60, 340)

    const camera = new THREE.PerspectiveCamera(
      62,
      mount.clientWidth / mount.clientHeight,
      0.1,
      900
    )
    camera.position.set(0, 5.6, 13)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item)
      return item
    }

    const gridTex = track(makeGridTexture())
    gridTex.repeat.set(30, 140)
    const floorGeo = track(new THREE.PlaneGeometry(150, 700))
    const floorMat = track(
      new THREE.MeshBasicMaterial({
        map: gridTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    )
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, -260)
    scene.add(floor)

    const ceilMat = track(
      new THREE.MeshBasicMaterial({
        map: gridTex,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )

    const ceil = new THREE.Mesh(floorGeo, ceilMat)
    ceil.rotation.x = -Math.PI / 2
    ceil.position.set(0, 26, -260)
    scene.add(ceil)

    const sunTex = track(makeSunTexture())
    const sunGeo = track(new THREE.PlaneGeometry(150, 150))
    const sunMat = track(
      new THREE.MeshBasicMaterial({
        map: sunTex,
        transparent: true,
        depthWrite: false,
        fog: false,
      })
    )
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(0, 30, -520)
    scene.add(sun)

    const starCount = 320
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (rng() - 0.5) * 700
      starPos[i * 3 + 1] = 24 + rng() * 150
      starPos[i * 3 + 2] = -300 - rng() * 380
    }
    const starGeo = track(new THREE.BufferGeometry())
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = track(
      new THREE.PointsMaterial({
        color: 0xffc9d4,
        size: 1.5,
        transparent: true,
        opacity: 0.75,
        fog: false,
      })
    )
    scene.add(new THREE.Points(starGeo, starMat))

    const ridgeGeo = track(new THREE.ConeGeometry(9, 16, 4, 1, true))
    const ridgeMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x8b1030,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      })
    )
    const ridges: THREE.Mesh[] = []
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(ridgeGeo, ridgeMat)
      const side = i % 2 === 0 ? -1 : 1
      m.position.set(
        side * (24 + rng() * 16),
        rng() * 4 - 2,
        -40 - (i / 2) * 52 - rng() * 20
      )
      m.scale.setScalar(0.6 + rng() * 0.9)
      m.rotation.y = rng() * Math.PI
      scene.add(m)
      ridges.push(m)
    }

    const unitBox = track(new THREE.BoxGeometry(1, 1, 1))
    const unitEdges = track(new THREE.EdgesGeometry(unitBox))
    const slabFill = track(
      new THREE.MeshBasicMaterial({
        color: 0x2a0616,
        transparent: true,
        opacity: 0.72,
      })
    )
    const slabLine = track(new THREE.LineBasicMaterial({ color: 0xff3355 }))
    const coreGeo = track(new THREE.OctahedronGeometry(0.42, 0))
    const coreMat = track(
      new THREE.MeshBasicMaterial({ color: 0x35e6ff, wireframe: true })
    )

    const makeSlab = (): Slab => {
      const root = new THREE.Group()
      root.add(new THREE.Mesh(unitBox, slabFill))
      root.add(new THREE.LineSegments(unitEdges, slabLine))
      return { root, cx: 0, cy: 0, w: 1, h: 1 }
    }

    const setSlab = (
      s: Slab,
      x0: number,
      x1: number,
      y0: number,
      y1: number
    ) => {
      s.w = Math.max(0.001, x1 - x0)
      s.h = Math.max(0.001, y1 - y0)
      s.cx = (x0 + x1) / 2
      s.cy = (y0 + y1) / 2
      s.root.scale.set(s.w, s.h, GATE_DEPTH)
      s.root.position.set(s.cx, s.cy, 0)
    }

    const waves: Wave[] = []
    for (let i = 0; i < WAVE_COUNT; i++) {
      const root = new THREE.Group()
      const slabs = [makeSlab(), makeSlab(), makeSlab(), makeSlab()]
      slabs.forEach((s) => root.add(s.root))
      const core = new THREE.Mesh(coreGeo, coreMat)
      root.add(core)
      root.visible = false
      scene.add(root)
      waves.push({
        root,
        slabs,
        core,
        z: SPAWN_Z,
        active: false,
        scored: false,
        coreAlive: false,
      })
    }

    const layoutWave = (w: Wave, z: number, diff: number) => {
      const gw = THREE.MathUtils.lerp(6.6, 4.3, diff)
      const gh = THREE.MathUtils.lerp(5.4, 3.3, diff)
      const gx = (rng() * 2 - 1) * (LANE_X - gw / 2 - 0.3)
      const gy = FLOOR_Y + gh / 2 + rng() * Math.max(0.1, CEIL_Y - FLOOR_Y - gh)

      const edge = LANE_X + 4
      setSlab(w.slabs[0], -edge, gx - gw / 2, -2, CEIL_Y + 5)
      setSlab(w.slabs[1], gx + gw / 2, edge, -2, CEIL_Y + 5)
      setSlab(w.slabs[2], gx - gw / 2, gx + gw / 2, -2, gy - gh / 2)
      setSlab(w.slabs[3], gx - gw / 2, gx + gw / 2, gy + gh / 2, CEIL_Y + 5)

      w.coreAlive = rng() > 0.42
      w.core.visible = w.coreAlive
      w.core.position.set(gx, gy, 0)
      w.z = z
      w.root.position.z = z
      w.root.visible = true
      w.active = true
      w.scored = false
    }

    const rig = createDrone(0xf5f3f4, 0xff3355, 0.62)
    disposables.push(rig)
    scene.add(rig.group)

    const debrisCount = 90
    const debrisPos = new Float32Array(debrisCount * 3)
    const debrisVel = new Float32Array(debrisCount * 3)
    const debrisGeo = track(new THREE.BufferGeometry())
    debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPos, 3))
    const debrisMat = track(
      new THREE.PointsMaterial({
        color: 0xff6b4a,
        size: 0.22,
        transparent: true,
        opacity: 1,
      })
    )
    const debris = new THREE.Points(debrisGeo, debrisMat)
    debris.visible = false
    scene.add(debris)

    const target = new THREE.Vector3(0, 3.4, DRONE_Z)
    const keys = new Set<string>()
    let usePointer = false
    let dist = 0
    let gates = 0
    let points = 0
    let speed = 30
    let sinceSpawn = 999
    let shake = 0
    let hudAccum = 0

    const resetRun = () => {
      waves.forEach((w) => {
        w.active = false
        w.root.visible = false
        w.z = SPAWN_Z
      })
      rig.group.position.set(0, 3.4, DRONE_Z)
      rig.group.rotation.set(0, 0, 0)
      target.set(0, 3.4, DRONE_Z)
      camera.position.set(0, 5.6, 13)
      dist = 0
      gates = 0
      points = 0
      speed = 30
      sinceSpawn = 999
      shake = 0
      debris.visible = false
      debrisMat.opacity = 1
      usePointer = false
      keys.clear()
      setScore(0)
      setPhase("playing")
      phaseRef.current = "playing"
    }

    apiRef.current.start = resetRun

    const blowUp = () => {
      const p = rig.group.position
      for (let i = 0; i < debrisCount; i++) {
        debrisPos[i * 3] = p.x
        debrisPos[i * 3 + 1] = p.y
        debrisPos[i * 3 + 2] = p.z
        debrisVel[i * 3] = (rng() - 0.5) * 15
        debrisVel[i * 3 + 1] = (rng() - 0.5) * 15
        debrisVel[i * 3 + 2] = (rng() - 0.5) * 15
      }
      debrisGeo.attributes.position.needsUpdate = true
      debris.visible = true
      debrisMat.opacity = 1
      shake = 1

      const total = Math.floor(points)
      setScore(total)
      if (total > bestRef.current) {
        bestRef.current = total
        writeBest(total)
        setBest(total)
      }
      setPhase("dead")
      phaseRef.current = "dead"
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (
        k === "arrowup" ||
        k === "arrowdown" ||
        k === "arrowleft" ||
        k === "arrowright" ||
        k === " "
      ) {
        e.preventDefault()
      }
      if (k === "escape") {
        exitRef.current()
        return
      }
      const p = phaseRef.current
      if ((k === " " || k === "enter") && (p === "ready" || p === "dead")) {
        resetRun()
        return
      }
      if (k === "r" && p === "dead") {
        resetRun()
        return
      }
      usePointer = false
      keys.add(k)
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())

    const onPointer = (e: PointerEvent) => {
      if (phaseRef.current !== "playing") return
      const r = mount.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = 1 - ((e.clientY - r.top) / r.height) * 2
      usePointer = true
      target.x = THREE.MathUtils.clamp(nx * LANE_X, -LANE_X, LANE_X)
      target.y = THREE.MathUtils.clamp(
        FLOOR_Y + ((ny + 1) / 2) * (CEIL_Y - FLOOR_Y),
        FLOOR_Y,
        CEIL_Y
      )
    }

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("resize", onResize)
    mount.addEventListener("pointermove", onPointer)

    const clock = new THREE.Clock()
    let raf = 0
    const prevPos = new THREE.Vector3()

    const hit = (w: Wave) => {
      const px = rig.group.position.x
      const py = rig.group.position.y
      for (const s of w.slabs) {
        if (
          Math.abs(px - s.cx) < s.w / 2 + HX &&
          Math.abs(py - s.cy) < s.h / 2 + HY
        ) {
          return true
        }
      }
      return false
    }

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.034)
      const p = phaseRef.current
      const running = p === "playing"
      const drift = running ? speed : 14
      let alive = running

      gridTex.offset.y += (drift * dt) / TILE

      const t = clock.elapsedTime
      if (!running) {
        rig.group.position.y = 3.4 + Math.sin(t * 1.6) * 0.18
        rig.group.rotation.y = Math.sin(t * 0.5) * 0.25
      }

      if (running) {
        dist += speed * dt
        points += speed * dt * 0.55
        speed = 30 + Math.min(40, dist * 0.011)

        if (!usePointer) {
          const sx = 17 * dt
          const sy = 12 * dt
          if (keys.has("arrowleft") || keys.has("a")) target.x -= sx
          if (keys.has("arrowright") || keys.has("d")) target.x += sx
          if (keys.has("arrowup") || keys.has("w")) target.y += sy
          if (keys.has("arrowdown") || keys.has("s")) target.y -= sy
          target.x = THREE.MathUtils.clamp(target.x, -LANE_X, LANE_X)
          target.y = THREE.MathUtils.clamp(target.y, FLOOR_Y, CEIL_Y)
        }

        prevPos.copy(rig.group.position)
        rig.group.position.x = THREE.MathUtils.damp(
          rig.group.position.x,
          target.x,
          9,
          dt
        )
        rig.group.position.y = THREE.MathUtils.damp(
          rig.group.position.y,
          target.y,
          9,
          dt
        )

        const vx = rig.group.position.x - prevPos.x
        const vy = rig.group.position.y - prevPos.y
        rig.group.rotation.z = THREE.MathUtils.damp(
          rig.group.rotation.z,
          -vx * 11,
          8,
          dt
        )
        rig.group.rotation.x = THREE.MathUtils.damp(
          rig.group.rotation.x,
          vy * 7,
          8,
          dt
        )
        rig.group.rotation.y = THREE.MathUtils.damp(
          rig.group.rotation.y,
          -vx * 3,
          8,
          dt
        )

        const diff = Math.min(1, dist / 2600)
        sinceSpawn += speed * dt
        const gap = THREE.MathUtils.lerp(52, 27, diff)
        if (sinceSpawn >= gap) {
          const free = waves.find((w) => !w.active)
          if (free) {
            layoutWave(free, SPAWN_Z, diff)
            sinceSpawn = 0
          }
        }
      }

      for (const w of waves) {
        if (!w.active) continue
        w.z += drift * dt
        w.root.position.z = w.z
        w.core.rotation.x += dt * 2.2
        w.core.rotation.y += dt * 3.1

        if (alive && Math.abs(w.z - DRONE_Z) < GATE_DEPTH / 2 + HX) {
          if (hit(w)) {
            alive = false
            blowUp()
          } else if (!w.scored) {
            w.scored = true
            gates += 1
            points += 60
            if (w.coreAlive) {
              const reach = Math.hypot(
                rig.group.position.x - w.core.position.x,
                rig.group.position.y - w.core.position.y
              )
              if (reach < 1.5) {
                w.coreAlive = false
                w.core.visible = false
                points += 240
              }
            }
          }
        }

        if (w.z > DESPAWN_Z) {
          w.active = false
          w.root.visible = false
        }
      }

      for (const m of ridges) {
        m.position.z += drift * dt
        if (m.position.z > 30) m.position.z -= 500
      }

      if (debris.visible) {
        for (let i = 0; i < debrisCount; i++) {
          debrisVel[i * 3 + 1] -= 9 * dt
          debrisPos[i * 3] += debrisVel[i * 3] * dt
          debrisPos[i * 3 + 1] += debrisVel[i * 3 + 1] * dt
          debrisPos[i * 3 + 2] += debrisVel[i * 3 + 2] * dt
        }
        debrisGeo.attributes.position.needsUpdate = true
        debrisMat.opacity = Math.max(0, debrisMat.opacity - dt * 0.55)
        if (debrisMat.opacity <= 0) debris.visible = false
      }

      rig.group.visible = p !== "dead"
      rig.props.forEach((pr, i) => {
        pr.rotation.y += (running ? 34 : 14) * dt + i * 0.002
      })

      const camX = rig.group.position.x * 0.3
      const camY = 5.6 + (rig.group.position.y - 3.4) * 0.22
      camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 4, dt)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 4, dt)
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 2)
        camera.position.x += (rng() - 0.5) * shake * 1.2
        camera.position.y += (rng() - 0.5) * shake * 1.2
      }
      camera.lookAt(rig.group.position.x * 0.35, 3.4, -18)
      sun.position.x = camera.position.x * 0.6

      hudAccum += dt
      if (hudAccum > 0.08) {
        hudAccum = 0
        if (scoreRef.current) {
          scoreRef.current.textContent = String(Math.floor(points)).padStart(
            6,
            "0"
          )
        }
        if (speedRef.current) {
          speedRef.current.textContent = (speed * 1.6).toFixed(0)
        }
        if (gateRef.current) gateRef.current.textContent = String(gates)
      }
      renderer.render(scene, camera)
    }

    if (reduced) {
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointermove", onPointer)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="ng-wrap" role="dialog" aria-label="Night Run, hidden game">
      <div className="ng-stage" ref={mountRef} />
      <div className="ng-scan" aria-hidden="true" />
      <div className="ng-vig" aria-hidden="true" />

      <div className="ng-hud" aria-hidden={phase !== "playing"}>
        <div className="ng-hud-l">
          <span className="ng-lbl">SCORE</span>
          <span className="ng-val" ref={scoreRef}>
            000000
          </span>
        </div>
        <div className="ng-hud-c">
          <span className="ng-lbl">GATES</span>
          <span className="ng-val" ref={gateRef}>
            0
          </span>
        </div>
        <div className="ng-hud-r">
          <span className="ng-lbl">KM/H</span>
          <span className="ng-val" ref={speedRef}>
            48
          </span>
        </div>
      </div>

      {phase === "boot" && (
        <div className="ng-panel ng-boot">
          <p>&gt; SIGNAL INTERCEPTED</p>
          <p>&gt; UPLINK 0x4E47 ESTABLISHED</p>
          <p>&gt; LOADING NIGHT RUN</p>
        </div>
      )}

      {phase === "ready" && (
        <div className="ng-panel">
          <span className="ng-eyebrow">CODEX MERCHANTS // CLASSIFIED</span>
          <h2>NIGHT RUN</h2>
          <p className="ng-sub">
            Fly the gaps. The grid gets faster. Grab the cyan cores.
          </p>
          <ul className="ng-keys">
            <li>
              {/* arrow keys pasted here this aint vibe code */}
              <b>↑ ↓ ← →</b> / <b>WASD</b> or drag to fly
            </li>
            <li>
              <b>SPACE</b> launch · <b>R</b> retry · <b>ESC</b> back to site
            </li>
          </ul>
          {best > 0 && <p className="ng-best">BEST {best}</p>}
          <button type="button" className="ng-btn" onClick={handleStart}>
            LAUNCH
          </button>
        </div>
      )}

      {phase === "dead" && (
        <div className="ng-panel">
          <span className="ng-eyebrow">SIGNAL LOST</span>
          <h2>WRECKED</h2>
          <p className="ng-score">{score}</p>
          <p className="ng-best">
            {score >= best ? "NEW BEST" : "BEST " + best}
          </p>
          <button type="button" className="ng-btn" onClick={handleStart}>
            RUN IT BACK
          </button>
        </div>
      )}

      <button
        type="button"
        className="ng-exit"
        onClick={() => exitRef.current()}
      >
        ESC · EXIT
      </button>
    </div>
  )
}
