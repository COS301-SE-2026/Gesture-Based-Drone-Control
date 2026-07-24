import { createContext, useContext } from "react"

export const CommandsContext = createContext(null)
export const useCommands = () => useContext(CommandsContext)
