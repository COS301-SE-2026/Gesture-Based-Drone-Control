import {useeCallback, useEffect,useRef,useState} from "react"
import PropTypes from "prop-types"
import * as THREE from "three"
import {CheckCircle2} from "lucide-react"
import {useTheme} from "@/context/ThemeContext"
import {useGestureCommands} from "@/hooks/useGestureCommands"
import{commandLabel} from "@/constants/GestureCommands"


const STEP_DELTA = {
    MOVE:UP:[0,1,0],
    MOVE_DOWN:[0,-1,0],
    MOVE_LEFT:[-1,0,0],
    MOVE_RIGHT:[1,0,0],
    MOVE_FORWARD:[0,0,-1],
    MOVE_BACKWARD:[0,0,1],
}

const BOUNDS ={minX:-4, maxX:4 , minY:3, maxY:3, minZ:-3,maxZ:3}
const WORLD_STEP = 0.55

const WAYPOINTS=[
    {X:-3, Y:0 , Z:0 , label: "Head toward Marker A"},
    {X:-3, Y:0 , Z:-2 , label: "Swing in front of A"},
    {X:-3, Y:1 , Z:-2 , label: "Climb into the loop"},
    {X:-1, Y:1 , Z:-2 , label: "Circle past Marker A"},
    {X:-1, Y:1 , Z:2 , label: "Loop behind Marker A"},
    {X:-1, Y:2 , Z:2 , label: "Climb higher"},
    {X:-1, Y:2 , Z:0 , label: "Head back toward center"},
    {X:0, Y:2 , Z:0 , label: "Reach the high point"},
    {X:3, Y:2 , Z:0 , label: "Head toward Marker B"},
    {X:3, Y:2 , Z:-2 , label: "Swing n front of Marker B"},
    {X:3, Y:1 , Z:-2 , label: "Dive into the loop"},
    {X:1, Y:1 , Z:-2 , label: "Circle past Marker B"},
    {X:1, Y:1 , Z:2 , label: "Loop behind Marker B"},
    {X:1, Y:0 , Z:2 , label: "Dive Lower"},
    {X:1, Y:0 , Z:0 , label: "Head back towards center"},
    {X:0, Y:0 , Z:0 , label: "Complete the figure-8"},
]


const MARKERS =[
    {x: -2, z:0, label:"Marker A"},
    {x: 2, z: 0, label : "Marker B"},
]

const clamp = (v, lo , hi) => Math.min(hi,Math.max(lo,v))
const toWorld =(gx,gy,gz) =>
    new THREE.Vector3(gx * WORLD_STEP,gy * WORLD_STEP, gz* WORLD_STEP)

export default function FIGUREEightSim ({ running, onComplete}) {
    const {theme} = useTheme()
    const mountRef = useRef(null)
    const droneRef = useRef(null)
    const targetRef = useRef(new THREE.Vector3(0,0,0))
    const mats = useRef({frame: null , red: null,rings:[] , markers:[] })

    const posRef = useRef({x:0 , y:0, z:0 })
    const idxRef = useRef(0)
    const runningRef = useRef(running)
    const doneRef = useRef(false)

    const[idx,setIdx] = useState(0)
    const [lastCmd,setLastCmd] = useState(null)
    const[moves,setMoves] = useState(0)
    const done = idx >= WAYPOINTS.length

    useEffect(() => {
        runningRef.current = running
    },[running])

    const handleCommand = useCallBack(
        (event) => {
            if(!runningRef.current || doneRef.current) return
            setLastCmd(commandLabel(event.command))

            const delta = STEP_DELTA[event.command]
            if (!delta) return

            const next = {
                x: clamp(posRef.current.x + delta[0], BOUNDS.minX, BOUNDS.maxX),
                y: clamp(posRef.current.y + delta[1], BOUNDS.minY , BOUNDS.maxY),
                z: clamp(posRef.current.z + delta[2], BOUNDS.minZ , BOUNDS.maxZ),

            }

            if(
                next.x === posRef.current.x &&
                next.y === posRef.current.y &&
                next.z === posRef.current.z
            )

            return

            posRef.current = next
            targetRef.current.copy(toWorld(next.x,next.y,next.z))
            setMoves((m) => m+1)


            const wp = WAYPOINTS[idxRef.current]
            if (wp && wp.x === next.x && wp.y && wp.z === next.z) {
                idxRef.current += 1
                setIdx(idx.current)
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
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches


        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(52,1,0.1,100)
        camera.position.set(0,1.5,8.5)
        camera.lookAt(0,0.55,0)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha:true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
        mount.appendChild(renderer.domElement)

        const frame = new THREE.MeshBasicMaterial({ wireframe: true , transparent: true,opacity :0.9})

    })


    const red = new THREE.MeshBasicMaterial({ wireframe: true})
    mats.current.frame = frame
    mats.current.red = red

    const drone = new THREE.Group()
    drone.add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 1.35, 2, 1, 2), frame))
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.28, 0.9 ,1,1,1), red)
    canopy.position.y = 0.32
    drone.add(canopy)
    const armA = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.12),frame)
    armA.rotation.y =Math.PI / 4
    const armB = armA.clone()
    armB.rotation.y = -Math.PI /4
    drone.add(armA, armB)

    
}