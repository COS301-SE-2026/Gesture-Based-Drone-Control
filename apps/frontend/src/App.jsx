import { Routes, Route } from "react-router-dom"
import RootLayout from "./components/layouts/RootLayout.jsx"
import {
  Gestures,
  Analytics,
  Settings,
  GPS,
  Login,
  Signup,
  Terms,
  Help,
  Tutorial,
} from "./components/organisms"
import { ThemeProvider } from "./context/ThemeProvider.jsx"
import { TelemetryProvider } from "./context/TelemetryProvider.jsx"
import { CommandsProvider } from "./context/CommandsProvider.jsx"
import { TourProvider} from "./context/TourContext.jsx"
import TestPage from "@/components/testPageForAtoms/TestPage.jsx"
import { CameraConsentProvider } from "./context/CameraConsentProvider.jsx"

function App() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <CommandsProvider>
          <CameraConsentProvider>
            <TourProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Gestures />} />
                <Route path="gestures" element={<Gestures />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
                <Route path="gps" element={<GPS />} />
                <Route path="help" element={<Help />} />
                <Route path="tutorial" element={<Tutorial />} />
                <Route path="test" element={<TestPage />} />
              </Route>
            </Routes>
            </TourProvider>
          </CameraConsentProvider>
        </CommandsProvider>
      </TelemetryProvider>
    </ThemeProvider>
  )
}

export default App
