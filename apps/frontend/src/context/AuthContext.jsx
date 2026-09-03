import {createContext, useContext} from "react"
export const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context){
        throw new Error("useAuth must be used in an AuthProvider")
    }
    
    return context

}