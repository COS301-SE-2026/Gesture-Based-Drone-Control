import { useState, useCallback, useEffect} from "react"
import { DroneConnectionContext } from "./DroneConnectionContext"
import { useTelemetry } from "./TelemetryContext"

const API = "http://localhost:3001/api/drone"

const MODE_TO_ADAPTER = {
    DroneSim: "projectairsim",
    Manual: "dummy",
    Autonomous: "dummy",
    Tello: "tello",
    Hardware: "tello"
}

const ADAPTER_TO_MODE = { projectairsim: "DroneSim", dummy: "Manual", tello: "Tello" }

function buildRequestBody(adapterType) {
    const body = { adapter: adapterType, host: "127.0.0.1"}
    if (adapterType === "projectairsim")
        return { ...body, vehicle_name: "Drone1", topics_port: 8989, services_port: 8990 }
    if (adapterType === "dummy") return { ...body, vehicle_name: "Drone-1" }
    if (adapterType === "tello") return { ...body, vehicle_name: "Tello-1" }
    return body
}

export function DroneConnectionProvider({ children }) {
    const { resetSession } = useTelemetry()
    const [droneMode, setDroneMode] = useState("None")
    const [connectionStatus, setConnectionStatus] = useState("disconnected")
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionError, setConnectionError] = useState("")

    useEffect(() => {
        fetch(`${API}/status`)
        .then((r) => r.json())
        .then((s) => {
            if (!s.connected) {
                sessionStorage.removeItem("droneMode")
                return
            }
            const saved = sessionStorage.getItem("droneMode")
            const mode =
                saved && MODE_TO_ADAPTER[saved] === s.adapter ? saved : ADAPTER_TO_MODE[s.adapter]
                if (mode) {
                    setDroneMode(mode)
                    setConnectionStatus("connected")
                }
        })
        .catch((err) => console.warn("could not fetch drone status:", err))
    }, [])

    const connectToDrone = useCallback(async (adapterType) => {
        setIsConnecting(true)
        setConnectionError("")
        try {
            const res = await fetch(`${API}/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildRequestBody(adapterType))
            })
            const data = await res.json()
            if (res.ok && data.connected) {
                setConnectionStatus("connected")
            }
            else {
                setConnectionStatus("failed")
                setConnectionError(data.message || data.detail || "connection failed")
            }
        }
        catch (err) {
            console.error("failed to connect to drone:", err)
            setConnectionStatus("failed")
            setConnectionError("could not reach backend")
        }
        finally {
            setIsConnecting(false)
        }
    }, [])

    const handleModeChange = useCallback(
        async (mode) => {
            setDroneMode(mode)
            sessionStorage.setItem("droneMode", mode)
            resetSession() //clear old trail and charts
            try {
                await fetch(`${API}/disconnect`, { method: "POST"})
            }
            catch (err) {
                console.warn("error disconnecting:", err)
            }
            const adapter = MODE_TO_ADAPTER[mode]
            if (adapter) await connectToDrone(adapter)
        },
    [connectToDrone, resetSession]
    )

    const handleDisconnect = useCallback(async () => {
        try {
            await fetch(`${API}/disconnect`, { method: "POST" })
        }
        catch (err) {
            console.warn("error disconnecting:", err)
        }
        finally {
            setDroneMode("None")
            sessionStorage.removeItem("droneMode")
            setConnectionStatus("disconnected")
            setConnectionError("")
            resetSession()
        }
    }, [resetSession])

    return (
        <DroneConnectionContext.Provider
        value={{
            droneMode, connectionStatus, isConnecting, connectionError,
            handleModeChange, handleDisconnect
            }}
        >
            {children}
        </DroneConnectionContext.Provider>
    )
}