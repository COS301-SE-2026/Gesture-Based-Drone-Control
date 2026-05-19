import { Routes, Route } from "react-router-dom";  // Remove BrowserRouter import
import RootLayout from "./components/layouts/RootLayout.jsx";
import Dashboard from "./components/organisms/Dashboard";  // Import directly for now
import { Gestures } from "./components/organisms/index.js";

function App() {
    return (
        <Routes>
            <Route path="/" element={<RootLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="gestures" element={<Gestures />} />
            </Route>
        </Routes>
    );
}

export default App;