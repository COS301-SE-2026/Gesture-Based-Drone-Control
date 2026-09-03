import { Routes, Route, Navigate } from "react-router-dom"
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
import TestPage from "@/components/testPageForAtoms/TestPage.jsx"
import { DebugProvider } from "./context/DebugProvider.jsx"
import CursorGlow from "./components/atoms/CursorGlow.jsx"
import { CameraConsentProvider } from "./context/CameraConsentProvider.jsx"
import { AuthProvider } from "./context/AuthProvider.jsx"

function App() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <CommandsProvider>
          <DebugProvider>
            <CursorGlow />
            <CameraConsentProvider>
              <AuthProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/app" element={<RootLayout />}>
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
              </AuthProvider>
            </CameraConsentProvider>
          </DebugProvider>
        </CommandsProvider>
      </TelemetryProvider>
    </ThemeProvider>
  )
}

export default App
