import { Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeProvider.jsx"
import { DebugProvider } from "@/context/DebugProvider.jsx"
import { TourProvider } from "@/context/TourProvider.jsx"
import CursorGlow from "@/components/atoms/CursorGlow.jsx"
import Help from "@/components/organisms/Help.jsx"
import License from "@/components/organisms/License.jsx"
import Practical from "@/components/organisms/Practical.jsx"
import WebLayout from "./WebLayout"
import WebGames from "./WebGames"

/**
 * Web demo app: games (keyboard / gamepad), the RPL licence pages and help.
 * No login, camera, gestures, drone connection, GPS or analytics - those are
 * in the desktop app, which visitors can download from the banner.
 */
export default function WebApp() {
  return (
    <ThemeProvider>
      <DebugProvider>
        <TourProvider>
          <CursorGlow />
          <Routes>
            <Route path="/app" element={<WebLayout />}>
              <Route index element={<Navigate to="games" replace />} />
              <Route path="games" element={<WebGames />} />
              <Route path="license" element={<License />} />
              <Route path="license/practical" element={<Practical />} />
              <Route path="help" element={<Help />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/games" replace />} />
          </Routes>
        </TourProvider>
      </DebugProvider>
    </ThemeProvider>
  )
}
