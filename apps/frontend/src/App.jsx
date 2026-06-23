import { Routes, Route } from "react-router-dom"
import RootLayout from "./components/layouts/RootLayout.jsx"
import {
  Dashboard,
  Gestures,
  Analytics,
  Settings,
  GPS,
  Login,
  Signup,
  Terms,
  Help,
} from "./components/organisms"
import { ThemeProvider } from "./context/ThemeProvider.jsx"

function App() {
  return (

    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="gestures" element={<Gestures />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="gps" element={<GPS />} />
          <Route path="help"element = {<Help />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

export default App
