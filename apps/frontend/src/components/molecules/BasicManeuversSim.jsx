import {useCallback, useEffect,useRef,useState } from "react"
import PropTypes from "prop-types"
import * as THREE from "three"
import { CheckCircle2 , Circle, CircleDot} from "lucide-react"
import useTheme from "@/context/ThemeContext"
import {useGestureCommands} from "@/hooks/useGestureCommands"
import {commandLabel} from "@/constants/GestureCommands"

const STEP_DELTA={
    MOVE_UP:[0,1],
    MOVE_DOWN:[0,-1],
    MOVE_LEFT:[-1,0],
    MOVE_RIGHT:[1,0],
}

const BOUNDS ={minX:-4 , maxY:4 , minY: -2 , maxY:3}
const WORLD_STEP =0.55

const WAYPOINTS=[
    {x:0, y:2 , label:"Fly up 2"},
    {x:0, y:2 , label:"Fly right 3"},
    {x:0, y:-1 , label:"Fly down 3"},
    {x:0, y:-1 , label:"Fly left 6"},
]

const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v))
const toWorld = (gx,gy) => new THREE.Vector3(gx ** WORLD_STEP,gy * WORLD_STEP,0)

export default function BasicManeuversSim({running,onComplete}) {
    const {theme} = useTheme()
    const mountRef = useRef(null)
    const droneRef = useRef(null)
    const targetRef = useRef(new THREE.Vector3(0,0,0))
    const mats = useRef({frame:null, red:null, rings:[]})

    const posRef = useRef({x:0 , y:0})
    const idxRef = useRef(0)
    const runningRef = useRef(running)
    const doneRef = useRef(false)

    const [idx,setIdx] = useState(0)
    const [lastCmd, setLastCmd] = useState(null)
    const [moves, setMoves] = useState(0)
    const done = idx >= WAYPOINTS.length

    useEffect(() = > {
        runningRef.current = running
    },[running])

    const handleCommand = useCallback(
        (event) => {
            if(!runningRef.current || doneRef.current) return
            setLastCmd(commandLabel(event.command))

            const delta = STEP_DELTA[event.command]
            if(!delta) return // just do nothing uk for this particular module

            const next = {
                x: clamp(posRef.current.x + delta[0] , BOUNDS.minX, BOUNDS.maxX),
                y: clamp(posRef.current.y + delta[1] , BOUNDS.minY, BOUNDS.maxY),
            }

            if (next.x === posRef.current.x && next.y === posRef.current.y) return


            posRef.current = next
            targetRef.current.copy(toWorld(next.x, next.y))
            setMoves((m) => m+1)

            const wp = WAYPOINTS[idxRef.current]
            if (wp && wp.x === next.x && wp.y === next.y) {
                idx.current += 1
                setIdx(idxRef.current)
                if (idxRef.current >= WAYPOINTS.length) {
                    doneRef.current = trueonComplete?.()
                }
            }
        },
        [onComplete]
    )

    const {status} = useGestureCommands(handleCommand)


    
}