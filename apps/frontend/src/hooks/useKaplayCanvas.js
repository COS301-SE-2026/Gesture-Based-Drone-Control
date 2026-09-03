import { useEffect, useRef } from "react";
import { GAME_CANVAS, GAME_COLORS } from "@/lib/gameTheme";
import chakraPetch from "@/assets/games/fonts/chakra-petch-v13-latin-600.woff2"
import spaceGrotesk from "@/assets/games/fonts/space-grotesk-v22-latin-500.woff2"
import jetbrainsMono from "@/assets/games/fonts/jetbrains-mono-v24-latin-regular.woff2"

/**
 * shared setup/teardown for a kaplay canvas
 * 
 * handles the dynamic import + instance creation and
 * cals k.quit() on unmount so we dont leak a running game loop
 * when we switch games or leave the page
 * 
 * onReady(k) fires onces its init, loads the stuff and fonts
 * there and calls k.go() inside the k.onLoad() so nothing renders
 * before the assets and fonts are ready
 */

export function useKaplayCanvas(canvasRef, onReady) {
    const initRef = useRef(false)
    const kRef = useRef(null)

    useEffect(() => {
        if (!canvasRef.current || initRef.current) return
        initRef.current = true

        let cancelled = false

        import("kaplay").then(({ default: kaplay }) => {
            if (cancelled) return

            const k = kaplay({
                canvas: canvasRef.current,
                width: GAME_CANVAS.width,
                height: GAME_CANVAS.height,
                stretch: true,
                letterbox: true,
                background: GAME_COLORS.bg,
                global: false
            })

            k.loadFont("heading", chakraPetch)
            k.loadFont("body", spaceGrotesk)
            k.loadFont("mono", jetbrainsMono)

            kRef.current = k
            onReady(k)
        })

        return () => {
            cancelled = true
            kRef.current?.quit()
            kRef.current = null
            initRef.current = false
        }
    }, [])

    return kRef
}