import{useCallBack,useEffect} from "react"
import{getWsUrl} from "@/lib/api"
import{useWebSocket} from "./useWebSocket"

const TRACKED_KEYS= new Set([
    "ArrorUp","ArrowDown","ArrowLeft", "ArrowRight","w","s","a","d","t"," ","l","Escape"
])

//the backend needs an edit for this to work, confirm with shav

export function useKeyboardInput()