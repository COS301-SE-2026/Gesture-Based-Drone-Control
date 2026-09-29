import { createContext, useContext } from "react"

export const DroneConnectionContext = createContext(null)
export const useDroneConnection = () => useContext(DroneConnectionContext)