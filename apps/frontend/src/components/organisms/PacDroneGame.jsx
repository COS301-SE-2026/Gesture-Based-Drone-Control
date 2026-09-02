import { useEffect, useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"

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

export default function PacDroneGame() {
    const canvasRef = useRef(null)
    const initialisedRef = useRef(false)

    useEffect(() => {
        if (!canvasRef.current || initialisedRef.current){
            return
        }
        return () => {
        }

    }, [])
    return (
        <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            style={{ aspectRatio: "16/9"}}
        />
    )
}