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