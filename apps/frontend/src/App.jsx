import { Routes, Route } from "react-router-dom" // Remove BrowserRouter import
import RootLayout from "./components/layouts/RootLayout.jsx"
import Dashboard from "./components/organisms/Dashboard" // Import directly for now
import {
  Analytics,
  Gestures,
  Settings,
  GPS,
} from "./components/organisms/index.js"

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="gestures" element={<Gestures />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="gps" element={<GPS />} />
      </Route>
    </Routes>
  )
}

export default App
