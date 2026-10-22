import { useCallback, useEffect, useRef, useState } from "react"
import useSecretCode, { CODEX } from "./hooks/useSecretCode"
import MudraExperience from "./components/organisms/MudraExperience"
import SecretGame from "./components/organisms/SecretGame"

const WARP_MS = 620

/**
 * The landing page is now the full-page WebGL experience in
 * components/organisms/MudraExperience.tsx. The previous section components
 * (Hero, StatsStrip, WhySection, ...) are still in the repo if you want to bring
 * any of them back below the experience.
 */
export default function App() {
  const [warped, setWarped] = useState(false)
  const [game, setGame] = useState(false)
  const timer = useRef(0)

  const unlock = useCallback(() => {
    setWarped(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setGame(true), WARP_MS)
  }, [])

  const exitGame = useCallback(() => {
    window.clearTimeout(timer.current)
    setGame(false)
    setWarped(false)
  }, [])

  useSecretCode(CODEX, unlock, !warped)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <>
      {!game && <MudraExperience />}
      {game && <SecretGame onExit={exitGame} />}
    </>
  )
}
