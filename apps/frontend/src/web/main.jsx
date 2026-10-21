// Entry point for the hosted web demo (see vite.web.config.js).
// The desktop app uses src/main.jsx instead.
import { installSessionTransport } from "./session"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"
import WebApp from "./WebApp"
import "../index.css"

installSessionTransport()

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <WebApp />
  </HashRouter>
)
