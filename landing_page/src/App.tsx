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

//App.css is the glassmorphism layer, imported after all components so
// its rules override component backgrounds bycascade order

import "./App.css"

export default function App() {
  const { theme } = useTheme()

  return (
    <div className="md-root" data-theme={theme}>
      <Ambience />
      <Navbar />
      <Sidebar />
      <Hero />
      <StatsStrip />
      <WhySection />
      <GestureShowcase />
      <PipelineSection />
      <FeaturesSection />
      <ModesSection />
      <DemoSection />
      <DownloadSection />
      <Footer />
    </div>
  )
}
