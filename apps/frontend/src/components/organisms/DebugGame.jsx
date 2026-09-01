// apps/frontend/src/components/organisms/DebugGame.jsx

import { useEffect, useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"
import testFont from "@/assets/games/testfont.ttf"

/**
 * Basically just a square that moves
 * and a log of the command piped into the game
 * not much more than that, just a place to test
 */

export default function DebugGame() {
  const canvasRef = useRef(null)
  const initialisedRef = useRef(false)
  const commandRef = useRef(null)

  useGameCommands((msg) => {
    commandRef.current?.(msg)
  })

  useEffect(() => {
    if (!canvasRef.current || initialisedRef.current) {
      return
    }
    initialisedRef.current = true

    import("kaplay").then(({ default: kaplay }) => {
      // all games should roughly follow this to be the same size (idk how scaling factors in)
      const k = kaplay({
        canvas: canvasRef.current,
        width: 1064,
        height: 600,
        stretch: true,
        letterbox: true,
        background: [10, 10, 10],
        global: false,
      })

      k.loadFont("font", testFont)

      // pretty much everything in this basic scene
      k.scene("debug", () => {
        const SPEED = 200
        const BLOCK_SIZE = 50

        // player controlled square
        const player = k.add([
          k.rect(BLOCK_SIZE, BLOCK_SIZE),
          k.color(230, 50, 50),
          k.pos(k.width() / 2, k.height() / 2),
          k.anchor("center"),
          "player",
        ])

        // border walls to lock the block in
        const WALL = 4
        k.add([k.rect(k.width(), WALL), k.pos(0, 0), k.color(80, 80, 80)])
        k.add([
          k.rect(k.width(), WALL),
          k.pos(0, k.height() - WALL),
          k.color(80, 80, 80),
        ])
        k.add([k.rect(WALL, k.height()), k.pos(0, 0), k.color(80, 80, 80)])
        k.add([
          k.rect(WALL, k.height()),
          k.pos(k.width() - WALL, 0),
          k.color(80, 80, 80),
        ])

        // show the last n entries on screen
        const MAX_LOG = 8
        const log = []

        // placeholder labels for the log
        const LogLabels = Array.from({ length: MAX_LOG }, (_, i) =>
          k.add([
            k.text("", { size: 50, font: "font" }),
            k.pos(12, 14 + i * 50),
            k.color(160, 160, 200),
            k.fixed(),
            k.z(100),
          ])
        )

        // works like a stack, how you'd expect
        function pushLog(entry) {
          log.unshift(entry)
          if (log.length > MAX_LOG) {
            log.pop()
          }
          LogLabels.forEach((label, i) => {
            label.text = log[i] ?? ""
          })
        }

        let vx = 0
        let vy = 0

        // map the incoming commands to a movement or log entry
        commandRef.current = (msg) => {
          const { command, left_x, left_y } = msg
          const ts = new Date().toLocaleTimeString("en-ZA", { hour12: false })
          pushLog(`${ts} ${command}`)

          // discrete movements [x, y]
          const DISCRETE = {
            MOVE_FORWARD: [0, -SPEED],
            MOVE_BACKWARD: [0, SPEED],
            MOVE_LEFT: [-SPEED, 0],
            MOVE_RIGHT: [SPEED, 0],
            MOVE_UP: [0, -SPEED],
            MOVE_DOWN: [0, SPEED],
          }

          if (DISCRETE[command]) {
            ;[vx, vy] = DISCRETE[command]
            // stop after a series of commands, timeout to trace properly
            setTimeout(() => {
              vx = 0
              vy = 0
            }, 200)
            return
          }

          // stop the block
          if (command === "HOVER" || command === "LAND") {
            vx = 0
            vy = 0
            return
          }

          // make block flash white
          if (command === "TAKEOFF") {
            player.color = k.rgb(255, 255, 255)
            setTimeout(() => {
              player.color = k.rgb(239, 68, 68)
            }, 300)
            return
          }

          if (command === "EMERGENCY_STOP") {
            vx = 0
            vy = 0
            player.color = k.rgb(255, 165, 0)
            setTimeout(() => {
              player.color = k.rgb(239, 68, 68)
            }, 500)
            return
          }

          // velocity straight from the sticks and triggers
          if (command === "ANALOG") {
            vx = (left_x ?? 0) * SPEED
            vy = (left_y ?? 0) * SPEED
          }
        }

        // apply the velocity to the block, keeping it within the canvas
        k.onUpdate(() => {
          player.pos.x = Math.max(
            BLOCK_SIZE / 2 + WALL,
            Math.min(
              k.width() - BLOCK_SIZE / 2 - WALL,
              player.pos.x + vx * k.dt()
            )
          )
          player.pos.y = Math.max(
            BLOCK_SIZE / 2 + WALL,
            Math.min(
              k.height() - BLOCK_SIZE / 2 - WALL,
              player.pos.y + vy * k.dt()
            )
          )
        })

        // TODO: also add keyboard controls for vibes
        // will do later am lazy

        // title
        k.add([
          k.text("DEBUG GAME", { size: 50, font: "font" }),
          k.anchor("topright"),
          k.pos(k.width() - 12, 12),
          k.color(80, 80, 100),
          k.fixed(),
          k.z(100),
        ])
      })
      //just go straight to the literal only thing
      k.onLoad(() => k.go("debug"))
    })

    return () => {
      commandRef.current = null
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ aspectRatio: "16/9" }}
    />
  )
}
