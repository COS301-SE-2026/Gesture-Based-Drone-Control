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

    useEffect(() => {
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


    useEffect(() => {
        const mount = mountRef.current
        if(!mount) return
        const reduced = window.matchMedia("(prefers-reduces-motion: reduce)").matches

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(50,1,0.1,100)
        camera.position.set(0,0.3,7)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(50,1,0.1,100)
        camera.position.set(0,0.3,7)

        const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
        mount.appendChild(renderer.domElement)


        const frame = new THREE.MeshBasicMaterial({ wireframe: true, transparent:true , opacity:0.9})
    })


    const red = new THREE.MeshBasicMaterial({wireframe:true })
    mats.current.frame = frame
    mats.current.red = red


    const drone = new THREE.Group()
    drone.add(new THREE.Mesh(new THREE.BoxGeometry(1.35,0.42,1.35,2,1,2), frame))
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.28,0.9,1,1,1), red)
    canopy.position.y = 0.32
    drone.add(canopy)
    const armA = new THREE.Mesh(new THREE.BoxGeometry(3.0,0.1,0.12) , frame)
    armA.rotation.y = Math.PI /4
    const armB = armA.clone()
    armB.rotation.y = -Math.PI /4
    drone.add(armA,armB)

    const props[]
    const rotorGeo = new THREE.TorusGeometry(0.52,0.035,6,26)
    const bladeGeo = new THREE.BoxGeometry(0.95,0.015,0.07)
    const d = 1.06

    ;[[d,d], [d,-d],[-d,d], [-d,-d]].forEach((px,pz)) => {
        const ring = new THREE.Mesh(rotorGeo, red)
        ring.rotation.x = Math.PI/2 
        
    }


}