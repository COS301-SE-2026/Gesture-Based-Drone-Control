import { useEffect, useRef } from "react"
import { GAME_CANVAS, GAME_COLORS } from "@/lib/gameTheme"
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

let mountCounter = 0

export function useKaplayCanvas(canvasRef, onReady) {
  const initRef = useRef(false)
  const kRef = useRef(null)

  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || initRef.current) return
    initRef.current = true

    let cancelled = false
    let ro = null

    // create a unique id per instance mounted
    const suffix = `${Date.now()}-${mountCounter++}`
    const fonts = {
      heading: `heading-${suffix}`,
      body: `body-${suffix}`,
      mono: `mono-${suffix}`,
    }

    import("kaplay")
      .then(({ default: kaplay }) => {
        if (cancelled) return

        const k = kaplay({
          canvas: canvas,
          width: GAME_CANVAS.width,
          height: GAME_CANVAS.height,
          stretch: true,
          letterbox: true,
          background: GAME_COLORS.bg,
          global: false,
          font: fonts.body,
        })

        k.loadFont(fonts.heading, chakraPetch)
        k.loadFont(fonts.body, spaceGrotesk)
        k.loadFont(fonts.mono, jetbrainsMono)

        kRef.current = k
        const parent = canvas.parentElement
        if (parent) {
          ro = new ResizeObserver(() => {
            window.dispatchEvent(new Event("resize"))
          })
          ro.observe(parent)
        }
        onReadyRef.current?.(k, fonts)
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load Kaplay: ", error)
        }
      })

    return () => {
      cancelled = true
      ro?.disconnect()
      kRef.current?.quit()
      kRef.current = null
      initRef.current = false
    }
  }, [canvasRef])

  return kRef
}
