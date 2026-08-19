// apps/frontend/src/components/organisms/FlappyDroneGame.jsx

import { useEffect, useRef } from "react"

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
        background: [255, 255, 255],
        global: false,
      })

      k.loadSprite("drone", "../../assets/games/flappy/drone.png")

      k.setGravity(0.0001)

      //main scene for gameplay
      k.scene("game", () => {
        const PIPE_OPEN = 240
        const PIPE_MIN = 60
        const JUMP_FORCE = 800
        const SPEED = 320
        const CEILING = -60

        // game object comprising of a bunch of components and tags
        const player = k.add([
          k.sprite("drone"),
          // position (x,y)
          k.pos(k.width / 4, 0),
          // enable collision checking
          k.area({isSensor: true}),
          //it will respond to gravity
          k.body(),
        ])

        player.onUpdate(() => {
          //stuff that we need to check for on each frame. nothing for now
        })

        //controls here. will add handlers when integrated with backend stuffs
        k.onKeyPress("up", () => player.jump(JUMP_FORCE))
        k.onKeyPress("right", () => player.jump(0.00001))
        k.onKeyPress("down", () => player.jump(-JUMP_FORCE))



      })
    })
  })

  return (
    <canvas
      ref={canvasRef}
      className=""
      style={{aspectRatio: "9/16"}}
    />
  )
}
