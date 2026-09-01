// apps/frontend/src/components/organisms/DebugGame.jsx

import { useEffect, useRef } from "react";
import { useGameCommands } from "@/hooks/useGameCommands";

export default function DebugGame() {
    const canvasRef = useRef(null)
    const initialisedRef = useRef(false)
    const commandRef = useRef(null)

    useGameCommands((msg) => {
        commandRef.current?.(msg)
    })

    useEffect(() => {

    }, [])

    return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl"
      style={{ aspectRatio: "16/9" }}
    />
    )
}