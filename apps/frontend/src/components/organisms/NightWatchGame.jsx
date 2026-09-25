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


}