// apps/frontend/src/components/organisms/FlappyDroneGame.jsx

import { useEffect, useRef } from "react"
import droneSprite from "@/assets/games/flappy/drone.png"


/**
 * this page houses everything for the kaplay minigame
 * it will be rendered inside a frame on the minigames page
 * and will (eventually) connect to a game websocket to
 * allow it to interpret and accept input like a drone.
 * for now it will just use keyboard inputs until the rest is
 * built out and ready for integration
 *
 * this is the first game we're adding so its gonna be a little
 * fuckass and overdocumented
 */

export default function FlappyDroneGame() {
  const canvasRef = useRef(null)
  const initialisedRef = useRef(false)

  useEffect(() => {
    if (!canvasRef.current || initialisedRef.current) return
    initialisedRef.current = true

    //load the library dynamically so site dont hang too long
    import("kaplay").then(({ default: kaplay }) => {
      // initialisation
      const k = kaplay({
        canvas: canvasRef.current,
        // fix the game resolution
        width: 400,
        height: 500,
        stretch: true,
        letterbox: true,
        background: [10, 10, 10],
        global: false,
      })

      k.loadSprite("drone", droneSprite)

      k.setGravity(1)

      //main scene for gameplay
      k.scene("game", () => {
        const PIPE_OPEN = 150
        const PIPE_MIN = 60
        const JUMP_FORCE = 250
        const SPEED = 250
        const CEILING = -250

        // game object comprising of a bunch of components and tags
        const player = k.add([
          k.sprite("drone", {
            width: 64,
            height: 64,
          }),
          // position (x,y)
          k.pos(k.width() / 8, k.height()/2),
          // enable collision checking
          k.area({ isSensor: true }),
          //it will respond to gravity
          k.body(),
          "player",
        ])

        // kill if player goes out of bounds
        player.onUpdate(() => {
          if (player.pos.y >= k.height() || player.pos.y <= CEILING) {
            k.go("lose", score)
          }
        })

        //controls here. will add handlers when integrated with backend stuffs
        k.onKeyPress("w", () => player.jump(JUMP_FORCE))
        k.onKeyPress("space", () => player.jump(0.00001))
        k.onKeyPress("s", () => player.jump(-JUMP_FORCE))
        
        // we want to spawn pipes around the center
        // take prev pipe into consideration so its not impossible
        let prevPipeH1 = k.center().y - PIPE_OPEN / 2

        // recalled to dynamically create pipes within a random window
        function spawnPipe() {
          const PIPE_MAX = k.height() - PIPE_MIN - PIPE_OPEN
          const low = Math.max(PIPE_MIN, prevPipeH1 - PIPE_OPEN * 1.2)
          const high = Math.min(PIPE_MAX, prevPipeH1 + PIPE_OPEN * 1.2)
          const h1 = prevPipeH1 = k.rand(low, high)
          const h2 = k.height() - h1 - PIPE_OPEN

          // generic object template for pipes to follow
          const makePipe = (posY, h) => [
            k.pos(k.width(), posY),
            k.rect(64, h),
            k.color(10, 0, 33),
            k.outline(4), //black outline on pixels
            k.area({ isSensor: true}), //collision
            k.move(k.LEFT, SPEED), //illusion of scrolling level
            k.offscreen({destroy: true}), //it dont exist if its behind us
            "pipe", //easier to refer to later on with a tag
          ]

          //make a top pipe
          k.add(makePipe(0, h1), {passed: true})

          //make a bottom pipe
          k.add([...makePipe(h1 + PIPE_OPEN, h2), {passed: false}])
        }

        // lose condition
        player.onCollide("pipe", () => k.go("lose", score))

        // the pipe is actually moving not the player
        // so when the pipe passes the player, give them a point
        k.onUpdate("pipe", (p) => {
          if (p.pos.x + p.width <= player.pos.x && !p.passed) {
            score++
            scoreLabel.text = score.toString()
            p.passed = true
          }
        })

        // spawn pipe every second
        k.loop(1, spawnPipe)

        let score = 0
        const scoreLabel = k.add([
          k.text("0", {size: 48}),
          k.anchor("center"), // keep it in place
          k.pos(k.width()/2, 80), //top centered
          k.fixed(), //unaffected by camera 
          k.z(1000), //big number because on top layer above all else
        ])
      })
         // the scene that shows when one crashes
         k.scene("lose", (score = 0) => {
          k.add([
            k.text(`Score: ${score}`, { size: 48 }),
            k.anchor("center"),
            k.pos(k.width() / 2, k.height() / 2 - 40),
            k.color(200,200,200),
          ])
          k.add([
            k.text("w to retry", {size: 24}),
            k.anchor("center"),
            k.pos(k.width() / 2, k.height() / 2 + 40),
            k.color(180, 180, 180),
          ])
          // option to retry 
          k.wait(0.2, () => {
            k.onKeyPress("w", () => k.go("game"))
            k.onMousePress(() => k.go("game"))
          })
         })

         k.go("game")
    })
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ aspectRatio: "9/16" }}
    />
  )
}
