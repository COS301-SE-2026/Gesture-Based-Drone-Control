import { creatContext, useContext } from "react"

export const DroneConnectionContext = creatContext(null)
export const useDroneConnection = () => useContext(DroneConnectionContext)