import { useEffect, useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"
import { Dir } from "fs"

/**
 * mazes are defined as 2d arrays
 * W = wall
 * . = dot
 * o = powerup
 * P = player spawn
 * G = ghost spawn
 */
const MAZE_A = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  " ...................P................. ",
  "W..WWW..W..WWW.W...WWW.WWW.WW.W.WWW.W.W",
  "W..Wo..W.W.WWW.WWW..W..WoW.W.WW..oW...W",
  "W..WWW.W.W.W.....W..W..WWW.W..W.WWW.W.W",
  "W.....................................W",
  "W.WWWWWW.WWW.WWW.WWWWW....WWWWW.W.W.W.W",
  "W.W......W.....W.W....W..W......W...W.W",
  "W.W.WWWW.W.WWW.W.W.WW..W.W.......WoW..W",
  " ...Wo...............G...WWWWWW...W... ",
  "W.W.WWWW.W.WWW.W.W.WW..W.W.......W.W..W",
  "W.W......W.....W.W....W..W......W...W.W",
  "W.WWWWWW.WWW.WWW.WWWWW....WWWWW.W.W.W.W",
  " ..................................... ",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
]

//keep an array so we can add more mazes
const mazes = [MAZE_A]

const tile = 32 //dimensions of a single tile
const cols = MAZE_A[0].length
const rows = MAZE_A.length

const w = cols * tile
const h = rows * tile

//colours
const col_wall = [30, 60, 180]
const col_dot = [200, 200, 150]
const col_power = [255, 255, 25]
const col_player = [255, 220, 0]
const col_bg = [12, 12, 12]

export default function PacDroneGame() {
  const canvasRef = useRef(null)
  const initialisedRef = useRef(false)
  const dirRef = useRef({ x: 0, y: 0 }) //direction from the ws used for input

  //movement mappings
  useGameCommands((msg) => {
    const { command, left_x, left_y } = msg
    const DIR = {
      MOVE_UP: { x: 0, y: -1 },
      MOVE_DOWN: { x: 0, y: 1 },
      MOVE_LEFT: { x: -1, y: 0 },
      MOVE_RIGHT: { x: 1, y: 0 },
      MOVE_FORWARD: { x: 0, y: -1 },
      MOVE_BACKWARD: { x: 0, y: -1 },
      ROTATE_CW: { x: 1, y: 0 },
      ROTATE_CCW: { x: -1, y: 0 },
    }
    // recognize and store commands to use them later
    if (DIR[command]) {
      dirRef.current = DIR[command]
      return
    }

    // analog inputs use dominant axis
    if (command === "ANALOG") {
        const ax = left_x ?? 0, ay = left_y ?? 0
        if (Math.abs(ax) > Math.abs(ay)) {
            dirRef.current = ax > 0 ? { x: 1, y: 0 } : { x: -1, y: 0}
        } else if (Math.abs(ay) > 0.2) {
            dirRef.current = ay > 0 ? { x: 0, y: 1 } : { x: 0, y: -1}
        }
    }
  })

  useEffect(() => {
    if (!canvasRef.current || initialisedRef.current) {
      return
    }

    import("kaplay").then(({ default: kaplay }) => {
        const k = kaplay({
            canvas: canvasRef.current,
            width: w,
            height: h,
            stretch: true,
            letterbox: true,
            background: col_bg,
            global: false,
        })

        //TODO: helper functions for collission

        // title scene
        k.scene("title", () => {
            k.add([k.text("PAC-DRONE", {size: 55}), k.anchor("center"),
                k.pos(w/2, h/2 - 120), k.color(...col_power)
            ])

            k.add([k.text("Choose a maze:", {size: 22}), k.anchor("center"),
                k.pos(w/2, h/2 - 30), k.color(...col_wall)])
        })
    })

    return () => {}
  }, [])
  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ aspectRatio: "16/9" }}
    />
  )
}
