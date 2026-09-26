import { useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"
import { useKaplayCanvas } from "@/hooks/useKaplayCanvas"
import { GAME_CANVAS, GAME_COLORS } from "@/lib/gameTheme"
import {
    HOUSE,
    WALLS,
    FURNITURE,
    FLOOR_ZONES,
    FLOOR,
    getObstacles
} from "../../lib/houselayout"
import {
    loadNightWatchSprites,
    FURNITURE_SPRITES,
    FLOOR_SPRITES,
    WALL_SPRITES,
} from "../../lib/sprites"
import {
    clamp,
    angleDiff,
    dist,
    resolveCollisions,
    randRange,
    hasLineOfSight
} from "../../constants/DroneSearchgameUtils"

const GAME_TIME = 90 //sec
const DRONE_RADIUS = 15
const DRONE_MOVE_SPEED = 200 //px/s
const DRONE_ROT_SPEED = 140 //deg/s
const INTRUDER_RADIUS = 13
const INTRUDER_SPEED = 70 //px/s
const LIGHT_RANGE = 240
const LIGHT_HALF_ANGLE = 28 //degrees either side of facing direction
const DETECT_DWELL = 0.4 //seconds of sustained light needed for a capture
const INTRUDER_COUNT = 3
const ANALOG_DEADZONE = 0.15
const FLOOR_TILE = 64
const WALL_TILE = 40
const ROTATE_IDLE_MS = 180

//Z layers 
const Z_FLOOR = 0
const Z_FURNITURE = 1
const Z_WALLS = 2
const Z_ENTITY = 3
const Z_OVERLAY = 5
const Z_CONE = 6
const Z_DRONE = 7
const Z_FX = 8
const Z_HUD = 11
const Z_PANEL = 12

export default function NightWatchGame() {
    const canvasRef = useRef(null)

    //continuous flight input, written by keyboard polling and by ws/gampad
    //gesture commands - kaplay scene reads every frame
    const inputRef = useRef({ forward: 0, strafe: 0, rotate: 0 })

    const lastRotateAtRef = useRef(0)

    //fires the start mission/ play again
    //once setupGame runes so takeoff can drive into intro and restart screens
    const actionRef = useRef(null)

    useGameCommands((msg) => {
        const { command, left_x, left_y, right_x, ltrigger, rtrigger } = msg
        const input = inputRef.current

        switch (command) {
            case "MOVE_FORWARD": 
                input.forward = 1
                break
            case "MOVE_BACKWARD": 
                input.forward = -1
                break
            case "MOVE_RIGHT": 
                input.strafe = 1
                break
            case "MOVE_LEFT": 
                input.strafe = -1
                break
            case "ROTATE_CW": 
                input.rotate = 1
                lastRotateAtRef.current = performance.now()
                break
            case "ROTATE_CCW": 
                input.rotate = -1
                lastRotateAtRef.current = performance.now()
                break
            case "HOVER":
                input.forward = 0
                input.strafe = 0
                input.rotate = 0
                break
            case "TAKEOFF":
                actionRef.current?.()
                break
            case "LAND":
                input.forward = 0
                input.strafe = 0
                break
            case "ANALOG": {
                const ly = left_y ?? 0
                const lx = left_x ?? 0
                const rotation = right_x ?? (rtrigger ?? 0) - (ltrigger ?? 0)
                input.forward = Math.abs(ly) > ANALOG_DEADZONE ? -ly : 0
                input.strafe = Math.abs(lx) > ANALOG_DEADZONE ? lx : 0
                input.rotate = Math.abs(rotation) > ANALOG_DEADZONE ? rotation : 0
                break
            }
            default:
                break
        }
    })

    useKaplayCanvas(canvasRef, (k, fonts) => setupGame(k, fonts, { inputRef, actionRef, lastRotateAtRef }))

    return (
        <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: `${GAME_CANVAS.width} / ${GAME_CANVAS.height}`}}
        />
    )
}

function setupGame(k, fonts, refs) {
    const { inputRef, lastRotateAtRef } = refs
    const obstacles = getObstacles()
    const col = (c) => k.rgb(...c) //color obj for outline() and .color reassignment

    loadNightWatchSprites(k)

    //mutable game state
    const game = { phase: "intro", timeLeft: GAME_TIME, foundCount: 0 }
    const drone = { pos: { x: HOUSE.x + HOUSE.w / 2, y: HOUSE.y + HOUSE.h / 2 }, angle: -90, obj: null, rotors: [] }

    let intruders = []
    let raccoons = []
    let fx = []
    let flashlightObjs = []
    let panelObjs = []
    const hud = {}


    //house rednering
    function tileFloor(zone) {
        const key = FLOOR_SPRITES[zone.floor]
        for (let y = zone.y; y < zone.y + zone.h; y += FLOOR_TILE) {
            const h = Math.min(FLOOR_TILE, zone.y + zone.h - y)
            for (let x = zone.x; x < zone.x + zone.w; x += FLOOR_TILE) {
                const w = Math.min(FLOOR_TILE, zone.x + zone.w - x)
                k.add([k.sprite(key, { width: w, height: h }), k.pos(x, y), k.anchor("topleft"), k.z(Z_FLOOR)])
            }
        }
    }

    function tileWall(seg) {
        const horizontal = seg.w >= seg.h
        const key = horizontal ? WALL_SPRITES.horizontal : WALL_SPRITES.vertical
        if (horizontal) {
            for (let x = seg.x; x < seg.x + seg.w; x += WALL_TILE) {
                const w = Math.min(WALL_TILE, seg.x + seg.w - x)
                k.add([k.sprite(key, { width: w, height: seg.h }), k.pos(x, seg.y), k.anchor("topleft"), k.z(Z_WALLS)])
            }
        }
        else {
            for (let y = seg.y; y < seg.y + seg.h; y += WALL_TILE) {
                const h = Math.min(WALL_TILE, seg.y + seg.h - y)
                k.add([k.sprite(key, { width: seg.w, height: h }), k.pos(seg.x, y), k.anchor("topleft"), k.z(Z_WALLS)])
            }
        }
    }

    function drawFurniture(item) {
        const key = FURNITURE_SPRITES[item.kind]

        if (item.collide === false) {
            if (key) {
                k.add([
                    k.sprite(key, { width: item.w, height: item.h }),
                    k.pos(item.x, item.y),
                    k.anchor("topleft"),
                    k.opacity(0.9),
                    k.z(Z_FURNITURE)
                ])
            }
            return
        }

        if (key) {
            k.add([
                k.sprite(key, { width: item.w, height: item.h }),
                k.pos(item.x, item.y),
                k.anchor("topleft"),
                k.z(Z_FURNITURE)
            ])
        }
        else {
            //fallback for pieces not cropped into a sprite yet
            k.add([
                k.rect(item.w, item.h, { radius: 3 }),
                k.pos(item.x, item.y),
                k.anchor("topleft"),
                k.color(...GAME_COLORS.surface),
                k.opacity(0.9),
                k.outline(2, col(GAME_COLORS.dim)),
                k.z(Z_FURNITURE)
            ])
        }
    }

    function buildHouse() {
        FLOOR_ZONES.forEach(tileFloor)
        FURNITURE.forEach(drawFurniture)
        WALLS.forEach(tileWall)

        k.add([
            k.pos(HOUSE.x, HOUSE.y),
            k.rect(HOUSE.w, HOUSE.h),
            k.anchor("topleft"),
            k.color(...GAME_COLORS.bg),
            k.opacity(0.5),
            k.z(Z_OVERLAY)
        ])
    }

    //spawning helpers for intruders
    function randomSpawn(radius, avoidPoints, minSeparation) {
        let pos = { x: FLOOR.x + FLOOR.w / 2, y: FLOOR.y + FLOOR.h / 2 }
        for (let attempt = 0; attempt < 40; attempt++) {
            pos = { x: randRange(FLOOR.x, FLOOR.x + FLOOR.w), y: randRange(FLOOR.y, FLOOR.y + FLOOR.h) }
            resolveCollisions(pos, radius + 4, obstacles, 3)
            const tooClose = avoidPoints.some((a) => dist(pos.x, pos.y, a.x, a.y) < minSeparation)
            if (!tooClose) return pos
        }
        return pos
    }

    //dronemaxxing
    function createDrone() {
        const container = k.add([
            k.pos(drone.pos.x, drone.pos.y),
            k.rotate(drone.angle),
            k.anchor("center"),
            k.z(Z_DRONE),
            "drone"
        ])

        //shadowmaxxing
        container.add([
            k.po(3, 3),
            k.circle(DRONE_RADIUS + 2),
            k.anchor("center"),
            k.color(0, 0, 0),
            k.opacity(0.35)
        ])

        //rotor armsmaxxing
        for (const ang of [45, 135, 225, 315]) {
            container.add([
                k.pos(0, 0),
                k.rotate(ang),
                k.rect(DRONE_RADIUS * 1.7, 3),
                k.anchor("center"),
                k.color(...GAME_COLORS.dim),
                k.opacity(0.9)
            ])
        }

        //rotors at the end of each arm
        const rotors= []
        for (const ang of [45, 135, 225, 315]) {
            const rad = (ang * Math.PI) / 180
            const rx = Math.cos(rad) * DRONE_RADIUS * 1.15
            const ry = Math.sin(rad) * DRONE_RADIUS * 1.15
            const rotor = container.add([
                k.pos(rx, ry),
                k.circle(6),
                k.anchor("center"),
                k.color(...GAME_COLORS.surface),
                k.outline(2, col(GAME_COLORS.dim)),
                k.scale(1)
            ])
            rotors.push(rotor)
        }

        //body of drone
        container.add([
            k.pos(0, 0),
            k.circle(DRONE_RADIUS * 0.75),
            k.anchor("center"),
            k.color(...GAME_COLORS.surface),
            k.outline(2, col(GAME_COLORS.ink))
        ])

        //nose light of drone aka shows facing direction
        container.add([
            k.pos(DRONE_RADIUS * 0.6, 0),
            k.circle(4),
            k.anchor("center"),
            k.color(...GAME_COLORS.red)
        ])

        drone.obj = container
        drone.rotors = rotors

    }

    function buildConePoints(range, halfAngDeg, segs = 12) {
        const pts = [k.vec2(0, 0)]
        for (let i = 0; i <= segs; i++) {
            const t = 1 / segs
            const ang = ((-halfAngDeg + t * halfAngDeg * 2) * Math.PI) / 100
            pts.push(k.vec2(Math.cos(ang) * range, Math.sin(ang) * range))
        }
        return pts
    }

    function createFlashLight() {
        const layers = [
            { range: LIGHT_RANGE, half: LIGHT_HALF_ANGLE, opacity: 0.1 },
            { range: LIGHT_RANGE * 0.68, half: LIGHT_HALF_ANGLE * 0.85, opacity: 0.16 },
            { range: LIGHT_RANGE * 0.38, half: LIGHT_HALF_ANGLE * 0.65, opacity: 0.24 }
        ]
        return layers.map((layer) => {
            const obj = k.add([
                k.pos(drone.pos.x, drone.pos.y),
                k.polygon(buildConePoints(layer.range, layer.half)),
                k.color(...GAME_COLORS.ink),
                k.opacity(layer.opacity),
                k.rotate(drone.angle),
                k.z(Z_CONE)
            ])
            obj.baseOpacity = layer.opacity
            return obj
        })
    }

    function syncDroneVisual() {
        drone.obj.pos = k.vec2(drone.pos.x, drone.pos.y + Math.sin(k.time() * 5) * 1.2)
        drone.obj.angle = drone.angle
        drone.rotors.forEach((r, i) => {
            const s = 1 + Math.sin(k.time() * 14 + i * 1.3) * 0.1
            r.scale = k.scale = k.vec2(s, s)
        })
    }

    function syncFlashLight() {
        for (const obj of flashlightObjs) {
            obj.pos = k.vec2(drone.pos.x, drone.pos.y)
            obj.angle = drone.angle
            obj.opacity = obj.baseOpacity + Math.sin(k.time() * 3) * 0.015
        }
    }

    //keyboard stuff is polled like shavs other games, controller writes continuously into inputRef
    function readAxis(posKey, negKey) {
        let v = 0
        if (k.isKeyDown(posKey)) v += 1
        if (k.isKeyDown(negKey)) v -= 1
        return v
    }

    function handleRotation(dt) {
        const kb = readAxis("e", "q")
        if (kb !== 0) {
            //keyboard polls live every frame so we dont need to watch it
            //naturally stops when key is released
            drone.angle += kb * DRONE_ROT_SPEED * dt
            return
        }

        //controller rotate input only count while its being actively refreshed
        //if nothign is touched within rotate_idle_ms, treat it as stale and force 0 so drone doesnt spin like toad on the chandellier
        const stale = performance.now() -lastRotateAtRef.current > ROTATE_IDLE_MS
        const rotateInput = stale ? 0 : clamp(inputRef.current.rotate, -1, 1)
        if (stale) inputRef.current.rotate = 0
        drone.angle += rotateInput * DRONE_ROT_SPEED * dt
    }

    function handleMovement(dt) {
        const kbforw = readAxis("w", "s")
        const kbstrafe = readAxis("d", "a")
        const forwardInput = kbforw !== 0 ? kbforw : clamp(inputRef.current.forward, -1, 1)
        const strafeInput = kbstrafe !== 0 ? kbstrafe : clamp(inputRef.current.strafe, -1, 1)
        let mx = strafeInput
        let my = -forwardInput
        const len = Math.hypot(mx, my)
        if (len > 1) {
            mx /= len
            my /= len
        }

        drone.pos.x += mx * DRONE_MOVE_SPEED * dt
        drone.pos.y += my * DRONE_MOVE_SPEED * dt

        resolveCollisions(drone.pos, DRONE_RADIUS, obstacles, 3)
        drone.pos.x = clamp(drone.pos.x, HOUSE.x + 10, HOUSE.x + HOUSE.w - 10)
        drone.pos.y = clamp(drone.pos.y, HOUSE.y + 10, HOUSE.y + HOUSE.h - 10)
    }

    //intruders pick a rng spot on floor, walk to it w collisions and along walls/furniture, pause to ponder, repeat
    function createIntruders() {
        intruders = []
        const avoid = [{ x: drone.pos.x, y: drone.pos.y}]
        for (let i = 0; i < INTRUDER_COUNT; i++) {
            const spawn = randomSpawn(INTRUDER_RADIUS, avoid, 110)
            avoid.push(spawn)

            const container = k.add([k.pos(spawn.x, spawn.y), k.anchor("center"), k.z(Z_ENTITY), "intruder"])
            container.add([
                k.pos(0, 0),
                k.rect(18, 24, { radius: 6 }),
                k.anchor("center"),
                k.color(...GAME_COLORS.bg),
                k.outline(2, col(GAME_COLORS.dim)),
                k.opacity(0.95)
            ])
            const indicator = container.add([
                k.pos(0, -4),
                k.circle(3),
                k.anchor("center"),
                k.color(...GAME_COLORS.red)
            ])

            intruders.push({
                obj: container,
                indicator,
                pos: { x: spawn.x, y: spawn.y },
                target: {
                    x: randRange(FLOOR.x, FLOOR.x + FLOOR.w),
                    y: randRange(FLOOR.y, FLOOR.y + FLOOR.h)
                },
                pauseTimer: randRange(0, 1),
                dwell: 0,
                frozen: false,
                caught: false,
                blinkT: Math.random() * 10
            })
        }
    }

    function moveIntruder(iv, dt) {
        if (iv.pauseTimer > 0) {
            iv.pauseTimer -= dt
            return
        }
        const d = dist(iv.pos.x, iv.pos.y, iv.target.x, iv.target.y)
        if (d < 10) {
            iv.target = {
                x: randRange(FLOOR.x, FLOOR.x + FLOOR.w),
                y: randRange(FLOOR.y, FLOOR.y + FLOOR.h)
            }
            iv.pauseTimer = randRange(0.3, 1.2)
            return
        }
        iv.pos.x += ((iv.target.x - iv.pos.x) / d) * INTRUDER_SPEED * dt
        iv.pos.y += ((iv.target.y - iv.pos.y) / d) * INTRUDER_SPEED * dt
        resolveCollisions(iv.pos, INTRUDER_RADIUS, obstacles, 2)
    }

    function updateIntruders(dt) {
        for (const iv of intruders) {
            if (iv.caught) continue

            iv.blinkT += dt
            const blink = 0.55 + Math.sin(iv.blinkT * 3.2) * 0.35
            iv.indicator.opacity = clamp(blink, 0.2, 1)

            if (!iv.frozen) moveIntruder(iv, dt)

                iv.obj.pos = k.vec2(iv.pos.x, iv.pos.y)
        }
    }

    //detection logic
    function runDetection(dt) {
        for (const iv of intruders) {
            if (iv.caught) continue

            const d = dist(drone.pos.x, drone.pos.y, iv.pos.x, iv.pos.y)
            let seen = false
            if (d <= LIGHT_RANGE) {
                const angToIntruder = (Math.atan2(iv.pos.y - drone.pos.y, iv.pos.x - drone.pos.x) * 100) / Math.PI
                const diff = Math.abs(angleDiff(drone.angle, angToIntruder))
                if (diff <= LIGHT_HALF_ANGLE) {
                    if (hasLineOfSight(drone.pos.x, drone.pos.y, iv.pos.x, iv.pos.y, obstacles)) {
                        seen = true
                    }
                }
            }

            if (seen) {
                iv.dwell += dt
                iv.frozen = true
                if (iv.dwell >= DETECT_DWELL) captureIntruder(iv)
            }
            else {
                iv.dwell = Math.max(0, iv.dwell - dt * 1.5)
                iv.frozen = iv.dwell > 0
            }
        }
    }

    function captureIntruder(iv) {
        iv.caught = true
        const px = iv.pos.x
        const py = iv.pos.y

        spawnDetectionFx(px, py)
        spawnRaccoons(px, py)
        game.foundCount += 1

        k.wait(0.6, () => {
            iv.obj.destroy()
        })

        if (game.foundCount >= INTRUDER_COUNT) endGame(true)
    }

    //detection effects and raccoons 
    function spawnDetectionFx(x, y) {
        const ring = k.add([
            k.pos(x, y),
            k.circle(6),
            k.anchor("center"),
            k.color(...GAME_COLORS.success),
            k.opacity(0.8),
            k.outline(3, col(GAME_COLORS.success)),
            k.z(Z_FX)
        ])
        fx.push({ obj: ring, t: 0, kind: "ring" })

        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PU * 2
            const star = k.add([
                k.pos(x, y),
                k.circle(2.5),
                k.anchor("center"),
                k.color(...GAME_COLORS.success),
                k.opacity(1),
                k.z(Z_FX)
            ])
            fx.push({ obj: star, t: 0, kind: "spark", dx: Math.cos(ang), dy: Math.sin(ang) })
        }
    }

    function updateFx(dt) {
        fx = fx.filter((f) => {
            f.t += dt
            if (f.kind === "ring") {
                f.obj.radius = 6 + f.t * 70
                f.obj.opacity = Math.max(0, 1 - f.t * 1.4)
            }
            if (f.t > 0.9) {
                f.obj.destroy()
                return false
            }
            return true
        })
    }

    function spawnRaccoons(x, y) {
        for (let i = 0; i < 2; i++) {
            const ang = randRange(0, Math.PI * 2)
            const obj = k.add([k.pos(x, y), k.anchor("center"), k.opacity(1), k.z(Z_ENTITY)])
            obj.add([
                k.pos(0, 0),
                k.circle(7),
                k.anchor("center"),
                k.color(...GAME_COLORS.surface),
                k.outline(2, col(GAME_COLORS.dim))
            ])
            obj.add([
                k.pos(-5, -6),
                k.circle(3),
                k.anchor("center"),
                k.color(...GAME_COLORS.surface),
                k.outline(2, col(GAME_COLORS.dim))
            ])
            obj.add([
                k.pos(5, -6),
                k.circle(3),
                k.anchor("center"),
                k.color(...GAME_COLORS.surface),
                k.outline(2, col(GAME_COLORS.dim))
            ])
            raccoons.push({ obj, pos: { x, y }, dir: { x: Math.cos(ang), y: Math.sin(ang) }, t: 0})
        }
    }

    function updateRaccoons(dt) {
        raccoons = raccoons.filter((r) => {
            r.t += dt
            r.pos.x += r.dir.x * 110 * dt
            r.pos.y += r.dir.y * 110 * dt
            r.obj.pos = k.vec2(r.pos.x, r.pos.y)
            r.obj.opacity = Math.max(0, 1 - r.t / 1.1)
            if (r.t > 1.1) {
                r.obj.destroy()
                return false
            }

            return true
        })
    }









}