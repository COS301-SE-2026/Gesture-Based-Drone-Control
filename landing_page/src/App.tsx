import useTheme from "./hooks/useTheme"
import Ambience from "./components/atoms/Ambience"
import Navbar from "./components/layouts/Navbar"
import Sidebar from "./components/layouts/Sidebar"
import Footer from "./components/layouts/Footer"
import Hero from "./components/organisms/Hero"
import StatsStrip from "./components/organisms/StatsStrip"
import WhySection from "./components/organisms/WhySection"
import GestureShowcase from "./components/organisms/GestureShowcase"
import PipelineSection from "./components/organisms/PipelineSection"
import FeaturesSection from "./components/organisms/FeaturesSection"
import ModesSection from "./components/organisms/ModesSection"
import DemoSection from "./components/organisms/DemoSection"
import DownloadSection from "./components/organisms/DownloadSection"
import FaqSection from "./components/organisms/FaqSection"
import DocsSection from "./components/organisms/DocsSection"
import UseCasesSection from "./components/organisms/UseCasesSection"
import SecretGame from "./components/organisms/SecretGame"

//App.css is the glassmorphism layer, imported after all components so
// its rules override component backgrounds bycascade order

import "./App.css"
import { useCallback, useEffect, useRef, useState } from "react"

const WAP_MS = 620

export default function App() {
  const { theme } = useTheme()
  const [warped, setWarped] = useState(false)
  const[game, setGame] = useState(false)
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

  useSecretCode(KONAMI, unlock !warped)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
  <>
    <div className={"md-root"  + (warped ? " md-warped" : "")}
    data-theme={theme}
    aria-hidden={warped}
    >
      <Ambience />
      <Navbar />
      <Sidebar />
      <Hero />
      <StatsStrip />
      <WhySection />
      <UseCasesSection />
      <GestureShowcase />
      <PipelineSection />
      <FeaturesSection />
      <ModesSection />
      <DemoSection />
      <DownloadSection />
      <FaqSection />
      <DocsSection />
      <Footer />
    </div>
    {game && <SecretGame onExit={exitGame} />}
    </>
  )
}
