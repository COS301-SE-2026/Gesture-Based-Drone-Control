import { Routes, Route } from "react-router-dom" 
import RootLayout from "./components/layouts/RootLayout.jsx"
import { Dashboard, Gestures, Analytics, Settings, GPS } from "./components/organisms"
import { ThemeProvider } from "./context/ThemeProvider.jsx" 


function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}

export default App
