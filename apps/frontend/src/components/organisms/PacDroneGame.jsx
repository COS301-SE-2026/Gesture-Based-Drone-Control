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
      const ax = left_x ?? 0,
        ay = left_y ?? 0
      if (Math.abs(ax) > Math.abs(ay)) {
        dirRef.current = ax > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }
      } else if (Math.abs(ay) > 0.2) {
        dirRef.current = ay > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 }
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
        k.add([
          k.text("PAC-DRONE", { size: 55 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 - 120),
          k.color(...col_power),
        ])

        k.add([
          k.text("Choose a maze:", { size: 22 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 - 30),
          k.color(...col_wall),
        ])

        // preview labels for mazes
        // starts with a semicolon because fuckass javascript
        ;["MAZE A"].forEach((label, i) => {
          const selected = k.add([
            k.text(`${i === 0 ? "▶" : " "} ${label}`, { size: 25 }),
            k.anchor("center"),
            k.pos(w / 2, h / 2 + 40 + i * 50), //offset and position below titles
            k.color(...col_dot),
          ])
          selected._index = i
        })

        // simple cursor for selection
        let cursor = 0
        const items = k.get("*").filter((o) => typeof o._index === "number")

        const refresh = () => {
          items.forEach((o) => {
            const idx = o._index
            const label = ["MAZE A"][idx]
            o.text = `${idx === cursor ? "▶" : " "}  ${label}`
            o.color = idx === cursor ? k.rgb(...col_dot) : k.rgb(...col_player)
          })
        }
        refresh()

        const move = (delta) => {
            cursor = (cursor + delta + 2) % 2
            refresh()
        }

        const pick = () => k.go("game", cursor)
        
        // fallback controls
        k.onKeyPress("arrowup",() => move(-1))
        k.onKeyPress("arrowdown",() => move( 1))
        k.onKeyPress("w", () => move(-1))
        k.onKeyPress("s",() => move( 1))
        k.onKeyPress("enter", () => pick())
        k.onKeyPress("space", () => pick())

        // ws direction picks 
        k.onUpdate(() => {
          const d = dirRef.current
          if (d.y === -1) { move(-1); dirRef.current = { x:0, y:0 }}
          if (d.y ===  1) { move( 1); dirRef.current = { x:0, y:0 }}
          if (d.x !== 0 || d.y !== 0 && Math.abs(d.x) > 0) {
            pick()
            dirRef.current = { x:0, y:0 }
          }
        })

        k.add([k.text("W/S or FLY UP to choose | Enter or FLY RIGHT to start",
            { size: 14 }), k.anchor("center"),
            k.pos(w/2, h - 30), col_wall
        ])

      })
      k.go("title")
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
