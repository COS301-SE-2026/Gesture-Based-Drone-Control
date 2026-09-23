import { useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"
import { useKaplayCanvas } from "@/hooks/useKaplayCanvas"
import { GAME_CANVAS, GAME_COLORS } from "@/lib/gameTheme"
import {
    HOUSE,
    WALLS,
    DOORS,
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
    DOOR_SPRITE
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
                break
            case "ROTATE_CCW": 
                input.rotate = -1
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

    useKaplayCanvas(canvasRef, (k, fonts) => setupGame(k, fonts, { inputRef, actionRef }))

    return (
        <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: `${GAME_CANVAS.width} / ${GAME_CANVAS.height}`}}
        />
    )
}

function setupGame(k, fonts, refs) {
    const { inputRef } = refs
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
}

