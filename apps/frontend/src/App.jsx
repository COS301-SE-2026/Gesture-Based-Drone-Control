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
  Calibration,
} from "./components/organisms"
import { ThemeProvider } from "./context/ThemeProvider.jsx"
import { TelemetryProvider } from "./context/TelemetryProvider.jsx"
import { CommandsProvider } from "./context/CommandsProvider.jsx"
import TestPage from "@/components/testPageForAtoms/TestPage.jsx"

function App() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <CommandsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/" element={<RootLayout />}>
              <Route index element={<Gestures />} />
              <Route path="gestures" element={<Gestures />} />
              <Route path="calibration" element={<Calibration />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="gps" element={<GPS />} />
              <Route path="help" element={<Help />} />
              <Route path="test" element={<TestPage />} />
            </Route>
          </Routes>
        </CommandsProvider>
      </TelemetryProvider>
    </ThemeProvider>
  )
}

export default App
