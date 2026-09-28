import {useCallback, useEffect,useRef,useState } from "react"
import PropTypes from "prop-types"
import * as THREE from "three"
import { CheckCircle2 , Circle, CircleDot} from "lucide-react"
import {useTheme} from "@/context/ThemeContext"
import {useGestureCommands} from "@/hooks/useGestureCommands"
import {commandLabel} from "@/constants/GestureCommands"

const STEP_DELTA={
    MOVE_UP:[0,1],
    MOVE_DOWN:[0,-1],
    MOVE_LEFT:[-1,0],
    MOVE_RIGHT:[1,0],
}

const BOUNDS ={minX:-4 , maxX:4 , minY: -2 , maxY:3}
const WORLD_STEP =0.55

const WAYPOINTS=[
    {x:0, y:2 , label:"Fly up 2"},
    {x:3, y:2 , label:"Fly right 3"},
    {x:3, y:-1 , label:"Fly down 3"},
    {x:-3, y:-1 , label:"Fly left 6"},
]

const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v))
const toWorld = (gx,gy) => new THREE.Vector3(gx * WORLD_STEP,gy * WORLD_STEP,0)

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
                idxRef.current += 1
                setIdx(idxRef.current)
                if (idxRef.current >= WAYPOINTS.length) {
                    doneRef.current = true
                    onComplete?.()
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
        const camera = new THREE.PerspectiveCamera(50,1,0.1,100)
        camera.position.set(0,0.3,7)

        const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
        mount.appendChild(renderer.domElement)


        const frame = new THREE.MeshBasicMaterial({ wireframe: true, transparent:true , opacity:0.9})
    


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

    const props= []
    const rotorGeo = new THREE.TorusGeometry(0.52,0.035,6,26)
    const bladeGeo = new THREE.BoxGeometry(0.95,0.015,0.07)
    const d = 1.06

    ;[[d, d], [d, -d], [-d,d], [-d,-d]].forEach(([px,pz]) => {
        const ring = new THREE.Mesh(rotorGeo, red)
        ring.rotation.x = Math.PI/2 
        ring.position.set(px, 0.22,pz)
        drone.add(ring)
        const prop = new THREE.Group()
        const b1 = new THREE.Mesh(bladeGeo, frame)
        const b2 = b1.clone()
        b2.rotation.y = Math.PI/2 
        prop.add(b1,b2)
        prop.position.set(px,0.24,pz)
        drone.add(prop)
        props.push(prop)
    })

    const legGeo = new THREE.BoxGeometry(0.06,0.5,0.06)
    ;[-0.45,0.45].forEach((lx) => {
        const leg = new THREE.Mesh(legGeo,frame)
        leg.position.set(lx,-0.42,0)
        drone.add(leg)
    })

    drone.scale.setScalar(0.35)
    scene.add(drone)
    droneRef.current = drone

    const ringGeo = new THREE.TorusGeometry(0.7,0.03,6,40)
    mats.current.rings = WAYPOINTS.map((wp) => {
        const m = new THREE.MeshBasicMaterial({transparent:true})
        const mesh = new THREE.Mesh(ringGeo, m)
        mesh.position.copy(toWorld(wp.x, wp.y))
        scene.add(mesh)
        return{mesh,m}
    })

    const resize = () => {
        const w= Math.max(1, mount.clientWidth)
        const h = Math.max(1, mount.clientHeight)
        camera.aspect = w/h 
        camera.updateProjectionMatrix()
        renderer.setSize(w,h)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    let raf = 0
    let t = 0
    const prev = new THREE.Vector3()
    const tick = () => {
        t += 0.016
        prev.copy(drone.position)
        drone.position.lerp(targetRef.current, reduced ? 1: 0.12)
        const vx = drone.position.x - prev.x 
        const vy = drone.position.y - prev.y
        if(!reduced) {
            drone.position.y += Math.sin(t * 1.7) * 0.002
            drone.rotation.z = THREE.MathUtils.lerp(drone.rotation.z , -vx * 6, 0.12)
            drone.rotation.x = THREE.MathUtils.lerp(drone.rotation.x , -vy * 4, 0.12)
            props.forEach((pr,i) => (pr.rotation.y += 0.55 + i * 0.03))
            const current = mats.current.rings [idxRef.current]
            if (current) current.mesh.scale.setScalar(1 + Math.sin(t *4) * 0.05) 
        }
        
        renderer.render(scene,camera)
        raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        renderer.dispose()
        if (renderer.domElement.parentNode === mount) renderer.domElement.remove()
    }
},[])

useEffect(() => {
    const raf = requestAnimationFrame(() => {
        const css = getComputedStyle(document.documentElement)
        const ink = css.getPropertyValue("--ink").trim()
        const redToken = css.getPropertyValue("--red").trim()
        mats.current.frame?.color.set(ink)
        mats.current.red?.color.set(redToken)
        mats.current.rings.forEach(({m,mesh}, i) => {
            mesh.scale.setScalar(1)
            if(i === idx){
                m.color.set(redToken)
                m.opacity = 1
            }
            else {
                m.color.set(ink)
                m.opacity = i < idx ? 0.15 : 0.4
            }
        })
    })

    return () => cancelAnimationFrame(raf)
},[theme,idx])

const linkLive = status === "open"

return (
    <div className="relative flex-1 min-h-0 rounded-lg border border-glassBrd bg-surface overflow-hidden">
        <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />

        <ol className = "absolute top-3 left-3 flex flex-col gap-1.5 text-xs">
            {WAYPOINTS.map((wp, i) => {
                const state = i < idx ? "done" : i === idx ? "current" : "pending"
                return(
                    <li
                    key={wp.label}
                    className ={`flex items-center gap-2 ${
                        state === "done" ? "text-success" : state === "current" ? "text-ink font-semibold" : "text-dim"}`}
                        >
                            {state === "done" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : state === "current" ? (
                                <CircleDot className="w-3.5 h-3.5 text-red"/>
                            ) : (
                                <Circle className="w-3.5 h-3.5"/>
                            ) }
                            {wp.label}
                        </li>
                )
            })}
        </ol>

        <div className ="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 font-mono text-xs text-dim">
            <div className = "flex flex-col gap-0.5">
                <span> Last command: {lastCmd ?? "none yet"}</span>
                <span>Moves: {moves}</span>
            </div>
            <span className={linkLive ? "text-ink" : "text-dim"}>
                {linkLive ? "Gesture link live" : "Connecting to gestures"}
            </span>
        </div>

        {(!running || done) && (
            <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
                <span className ="rounded-full border border-glassBrd bg-glass px-3 py-1 text-xs text-ink">
                    {done ? "Module complete": "Press start exercise to begin"}
                </span>
                </div>
        )}
    </div>
)

}

BasicManeuversSim.propTypes = {
    running: PropTypes.bool,
    onComplete: PropTypes.func,
}

BasicManeuversSim.defaultProps ={
    running: false,
    onComplete: undefined,
}


