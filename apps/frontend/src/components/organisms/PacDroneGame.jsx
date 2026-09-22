import { useEffect, useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"

import eatSound from "@/assets/games/pac/eat.mp3"
import powerSound from "@/assets/games/pac/power.mp3"
import dieSound from "@/assets/games/pac/die.mp3"
import margitSound from "@/assets/games/pac/margit.mp3"

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
  " G....................................G",
  "W..WWW..W..WWW.W.P.WWW.WWW.WW.W.WWW.W.W",
  "W..Wo..W.W.WWW.WWW..W..W W.W.WW..oW...W",
  "W..WWW.W.W.W.....W..W..WWW.W..W.WWW.W.W",
  "W.....................................W",
  "W.WWWWWW.WWW.WWW.WWWWW....WWWWW.W.W.W.W",
  "W.W......W..G..W.W.G..W..W..G...W...W.W",
  "W.W.WWWW.W.WWW.W.W.WW..W.W.......WoW..W",
  " ...Wo...............G...WWWWWW...W... ",
  "W.W.WWWW.W.WWW.W.W.WW..W.W.......W.W..W",
  "W.W......W..G..W.W.G..W..W..G...W...W.W",
  "W.WWWWWW.WWW.WWW.WWWWW....WWWWW.W.W.W.W",
  " G....................................G",
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
const col_ghost = [90, 5, 5]
const col_scared = [12, 100, 12]

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
    initialisedRef.current = true

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

      //asset imports
      k.loadSound("eat", eatSound)
      k.loadSound("power", powerSound)
      k.loadSound("die", dieSound)
      k.loadSound("margit", margitSound)

      //helper functions for collission
      const tileAt = (maze, col, row) => maze[row]?.[col] ?? "W"
      const isWall = (maze, col, row) => tileAt(maze, col, row) === "W"
      const px = (col) => col * tile + tile / 2
      const py = (row) => row * tile + tile / 2

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
        k.onKeyPress("arrowup", () => move(-1))
        k.onKeyPress("arrowdown", () => move(1))
        k.onKeyPress("w", () => move(-1))
        k.onKeyPress("s", () => move(1))
        k.onKeyPress("enter", () => pick())
        k.onKeyPress("space", () => pick())

        // ws direction picks
        k.onUpdate(() => {
          const d = dirRef.current
          if (d.y === -1) {
            move(-1)
            dirRef.current = { x: 0, y: 0 }
          }
          if (d.y === 1) {
            move(1)
            dirRef.current = { x: 0, y: 0 }
          }
          if (d.x !== 0 || (d.y !== 0 && Math.abs(d.x) > 0)) {
            pick()
            dirRef.current = { x: 0, y: 0 }
          }
        })

        k.add([
          k.text("W/S or FLY UP to choose | Enter or FLY RIGHT to start", {
            size: 14,
          }),
          k.anchor("center"),
          k.pos(w / 2, h - 30),
          k.color(...col_wall),
        ])
      })

      // main game scene
      k.scene("game", (mazeIndex = 0) => {
        const maze = mazes[mazeIndex].map((row) => row.split("")) //render line by line
        let dotsLeft = 0
        let score = 0
        let scared = false
        let scaredTimer = 0

        // draw the tiles and spawn locations

        let playerSpawn = { col: 1, row: 1 } //placeholder first index
        const ghostSpawns = []

        // parse the grid one by one char
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const ch = maze[row][col]

            // see a wall
            if (ch === "W") {
              k.add([
                k.rect(tile, tile),
                k.pos(col * tile, row * tile),
                k.color(...col_wall),
                k.z(0),
              ])
              // subtle border highlight
              k.add([
                k.rect(tile - 2, tile - 2),
                k.pos(col * tile + 1, row * tile + 1),
                k.color(40, 80, 200),
                k.z(1),
              ])
              continue
            }

            // see floor that can be replaced with something else
            // floor
            k.add([
              k.rect(tile, tile),
              k.pos(col * tile, row * tile),
              k.color(20, 20, 30),
              k.z(0),
            ])

            // see a pellet on the floor
            if (ch === ".") {
              k.add([
                k.circle(3),
                k.anchor("center"),
                k.pos(px(col), py(row)),
                k.color(...col_dot),
                k.z(2),
                "dot",
                { col, row },
              ])
              dotsLeft++
            }
            // see a power up on the floor
            else if (ch === "o") {
              k.add([
                k.circle(7),
                k.anchor("center"),
                k.pos(px(col), py(row)),
                k.color(...col_power),
                k.z(2),
                "pellet",
                { col, row },
              ])
              dotsLeft++
            }
            // player will spwn on this tile
            else if (ch === "P") {
              playerSpawn = { col, row }
            }
            // ghosts will spawn on this tile
            else if (ch === "G") {
              ghostSpawns.push({ col, row })
            }
          }
        }

        // score labels
        const scoreLbl = k.add([
          k.text(`SCORE ${score}`, { size: 18 }),
          k.anchor("topleft"),
          k.pos(8, 8),
          k.color(...col_player),
          k.fixed(),
          k.z(200),
        ])
        const statusLbl = k.add([
          k.text("", { size: 15 }),
          k.anchor("topright"),
          k.pos(w - 8, 8),
          k.color(...col_power),
          k.fixed(),
          k.z(200),
        ])

        // actual player
        const PLAYER_SPEED = tile * 7
        const GHOST_SPEED = tile * 3.5
        const ALIGN_THRESHOLD = 3

        const player = k.add([
          k.circle(tile / 2),
          k.anchor("center"),
          k.pos(px(playerSpawn.col), py(playerSpawn.row)), //spawn point
          k.color(...col_player),
          k.z(10),
          "player",
        ])

        //the players logical position (tile) is tracked separately from
        //real position, to track collission
        let playerCol = playerSpawn.col
        let playerRow = playerSpawn.row
        let facing = { x: 1, y: 0 } //to decide next movement
        let pending = { x: 1, y: 0 }

        // ghosts and ghost AI
        //ghosts will randomly pick a direction from here
        const GHOST_DIRS = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ]

        // spawn a ghost in each ghost spawn location
        // then give it a random direction to go in
        const ghosts = (
          ghostSpawns.length ? ghostSpawns : [{ col: 1, row: 11 }]
        ).map(({ col, row }, i) => {
          const g = k.add([
            k.rect(tile - 8, tile - 8),
            k.anchor("center"),
            k.pos(px(col), py(row)),
            k.color(...col_ghost),
            k.z(10),
            "ghost",
          ])
          g._col = col
          g._row = row
          //snap ghosts to tle
          g._tx = col
          g._ty = row
          g._dir = { x: 0, y: 0 }
          g._speed = GHOST_SPEED * (1 + i * 0.1) //random variances in speed
          return g
        })

        // controls
        // keyboard controls fallback
        k.onKeyDown("arrowleft", () => {
          pending = { x: -1, y: 0 }
        })
        k.onKeyDown("arrowright", () => {
          pending = { x: 1, y: 0 }
        })
        k.onKeyDown("arrowup", () => {
          pending = { x: 0, y: -1 }
        })
        k.onKeyDown("arrowdown", () => {
          pending = { x: 0, y: 1 }
        })
        k.onKeyDown("a", () => {
          pending = { x: -1, y: 0 }
        })
        k.onKeyDown("d", () => {
          pending = { x: 1, y: 0 }
        })
        k.onKeyDown("w", () => {
          pending = { x: 0, y: -1 }
        })
        k.onKeyDown("s", () => {
          pending = { x: 0, y: 1 }
        })

        //smooth movement

        //how far is the entity from the center of its current tile?
        //when this is small enough we can count the entity as 'on' the tile
        const perpendicularOffset = (posX, posY, dir) => {
          if (dir.x !== 0) {
            return Math.abs(posY - py(Math.round((posY - tile / 2) / tile)))
          }
          if (dir.y !== 0) {
            return Math.abs(posX - px(Math.round((posX - tile / 2) / tile)))
          }
          return 0
        }

        // Snap the entity onto the grid axis its on
        // so it can go through corridors neatly
        const snapToAxis = (entity, dir) => {
          if (dir.x !== 0) {
            const row = Math.round((entity.pos.y - tile / 2) / tile)
            entity.pos.y = py(row)
          } else if (dir.y !== 0) {
            const col = Math.round((entity.pos.x - tile / 2) / tile)
            entity.pos.x = px(col)
          }
        }

        // get the current coordiantes as a tile from pixel positions
        const tileCol = (x) => Math.round((x - tile / 2) / tile)
        const tileRow = (y) => Math.round((y - tile / 2) / tile)

        // check if a ghost can step out of the tile
        const canEnter = (col, row) =>
          !isWall(maze, ((col % cols) + cols) % cols, row)

        //choose a new direction of any neighbour except backtracking
        // will backtrack in the case of a dead end as a last resort
        const pickGhostDir = (g) => {
          const open = GHOST_DIRS.filter((d) =>
            canEnter(g._col + d.x, g._row + d.y)
          )
          const forward = open.filter(
            (d) => !(d.x === -g._dir.x && d.y === -g._dir.y)
          )
          const pool = forward.length ? forward : open
          return pool.length
            ? pool[Math.floor(Math.random() * pool.length)]
            : null
        }

        const moveGhost = (g, dt) => {
          let dist = g._speed * dt
          while (dist > 0) {
            const dx = px(g._tx) - g.pos.x
            const dy = py(g._ty) - g.pos.y
            const remaining = Math.abs(dx) + Math.abs(dy)

            if (remaining > dist) {
              g.pos.y += Math.sign(dy) * dist
              g.pos.x += Math.sign(dx) * dist
              return
            }

            //ghost has arrived at the target tile
            g.pos.x = px(g._tx)
            g.pos.y = py(g._ty)
            dist -= remaining

            //handle tunnel wrap for target -1 or target == cols
            if (g._tx < 0) {
              g._tx += cols
              g.pos.x += cols * tile
            } else if (g._tx >= cols) {
              g._tx -= cols
              g.pos.x -= cols * tile
            }

            g._col = g._tx
            g._row = g._ty

            const next = pickGhostDir(g)
            if (!next) {
              return //boxed in somehow
            }

            g._dir = next
            g._tx = g._col + next.x
            g._ty = g._row + next.y
          }
        }

        //update positions
        k.onUpdate(() => {
          const dt = k.dt()

          // apply the pending direction
          const wd = dirRef.current
          if (wd.x !== 0 || wd.y !== 0) {
            pending = { ...wd }
          }

          //smooth player movement

          {
            // check if the player can be considered 'on the tile'
            const offPerp = perpendicularOffset(
              player.pos.x,
              player.pos.y,
              facing
            )
            const aligned = offPerp < ALIGN_THRESHOLD

            if (aligned) {
              // turn into the pending direction
              const nc = tileCol(player.pos.x) + pending.x
              const nr = tileRow(player.pos.y) + pending.y
              const wc = (nc + cols) % cols
              if (!isWall(maze, wc, nr)) {
                facing = { ...pending }
                snapToAxis(player, facing)
              }
            }

            //advance in the direction we're facing
            const nc = tileCol(player.pos.x + facing.x * PLAYER_SPEED * dt)
            const nr = tileRow(player.pos.y + facing.y * PLAYER_SPEED * dt)
            const wc = (nc + cols) % cols

            if (!isWall(maze, wc, nr)) {
              player.pos.x += facing.x * PLAYER_SPEED * dt
              player.pos.y += facing.y * PLAYER_SPEED * dt

              //horizontal tunnel, wraparound to the other side
              if (player.pos.x < 0) {
                player.pos.x += cols * tile
              }
              if (player.pos.x > cols * tile) {
                player.pos.x -= cols * tile
              }
            } else {
              if (facing.x !== 0) {
                player.pos.x = px(playerCol)
              }
              if (facing.y !== 0) {
                player.pos.y = py(playerRow)
              }
              facing = { x: 0, y: 0 }
            }

            // update the logical position as well for dot collection and collission
            playerCol = tileCol(player.pos.x)
            playerRow = tileRow(player.pos.y)

            // collect dots and pellets according to logical coordinate
            k.get("dot").forEach((d) => {
              if (d.col === playerCol && d.row === playerRow) {
                k.play("eat", { volume: 0.5 })
                k.destroy(d) //one time use
                score += 10
                dotsLeft-- //tracked for win condition
                scoreLbl.text = `SCORE ${score}`
              }
            })
            k.get("pellet").forEach((p) => {
              if (p.col === playerCol && p.row === playerRow) {
                k.play("power", { volume: 0.5 })
                k.destroy(p)
                score += 50 //worth more points
                dotsLeft--
                scoreLbl.text = `SCORE ${score}`
                scared = true // set the ghosts to be consumed
                scaredTimer = 9
                ghosts.forEach((g) => (g.color = k.rgb(...col_scared)))
                statusLbl.text = "EAT THE GHOSTS!!!"
              }
            })
          }

          // scared timer countdown
          if (scared) {
            scaredTimer -= dt
            if (scaredTimer <= 0) {
              scared = false
              ghosts.forEach((g) => (g.color = k.rgb(...col_ghost)))
              statusLbl.text = ""
              // timer running out
            } else if (scaredTimer < 2) {
              const flash = Math.floor(scaredTimer * 4) % 2 === 0
              ghosts.forEach(
                (g) =>
                  (g.color = flash
                    ? k.rgb(...col_scared)
                    : k.rgb(200, 200, 255))
              )
            }
          }

          // smooth ghost movement
          ghosts.forEach((g) => {
            moveGhost(g, dt)

            // collision logic comparing logical coords
            const gc = tileCol(g.pos.x)
            const gr = tileRow(g.pos.y)
            if (gc === playerCol && gr === playerRow) {
              // eat the ghost
              if (scared) {
                const spawn = ghostSpawns[ghosts.indexOf(g)] ??
                  ghostSpawns[0] ?? { col: 1, row: 1 }
                g._col = spawn.col
                g._row = spawn.row
                g._dir = { x: 0, y: 0 }
                g.pos.x = px(spawn.col)
                g.pos.y = py(spawn.row)
                g.color = k.rgb(...col_ghost)
                score += 200
                scoreLbl.text = `SCORE  ${score}`
              } else {
                // ghost eat us
                k.play("die")
                k.go("lose", score, mazeIndex)
              }
            }
          })

          // win condition
          if (dotsLeft <= 0) {
            const next = (mazeIndex + 1) % mazes.length
            k.go("win", score, next)
          }
        })
      })

      // win scene
      k.scene("win", (score = 0, nextMaze = 0) => {
        k.add([
          k.text("YOUR'E WINNER!", { size: 48 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 - 80),
          k.color(...col_power),
        ])

        k.add([
          k.text(`Score: ${score}`, { size: 28 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2),
          k.color(...col_wall),
        ])

        k.add([
          k.text("Next", { size: 18 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 + 60),
          k.color(...col_player),
        ])

        k.wait(2.5, () => k.go("game", nextMaze))
      })

      // lose scene
      k.scene("lose", (score = 0, mazeIndex = 0) => {
        k.play("margit")

        k.add([
          k.text("YOU DIED", { size: 52 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 - 80),
          k.color(...col_ghost),
        ])
        k.add([
          k.text(`Score: ${score}`, { size: 28 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2),
          k.color(...col_wall),
        ])
        k.add([
          k.text("Enter / Space to retry  |  T for title", { size: 16 }),
          k.anchor("center"),
          k.pos(w / 2, h / 2 + 70),
          k.color(120, 120, 140),
        ])
        k.wait(0.3, () => {
          k.onKeyPress("enter", () => k.go("game", mazeIndex))
          k.onKeyPress("space", () => k.go("game", mazeIndex))
          k.onKeyPress("t", () => k.go("title"))
          // any ws command restarts
          const unsub = k.onUpdate(() => {
            const d = dirRef.current
            if (d.x !== 0 || d.y !== 0) {
              dirRef.current = { x: 0, y: 0 }
              k.go("game", mazeIndex)
              unsub.cancel()
            }
          })
        })
      })

      k.go("title")
    })

    return () => {
      dirRef.current = { x: 0, y: 0 }
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
