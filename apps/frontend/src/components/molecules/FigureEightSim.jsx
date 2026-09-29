import {useCallback, useEffect,useRef,useState} from "react"
import PropTypes from "prop-types"
import * as THREE from "three"
import {CheckCircle2, Circle, CircleDot} from "lucide-react"
import {useTheme} from "@/context/ThemeContext"
import {useGestureCommands} from "@/hooks/useGestureCommands"
import{commandLabel} from "@/constants/GestureCommands"


const STEP_DELTA = {
    MOVE_LEFT:[-1,0,0],
    MOVE_RIGHT:[1,0,0],
    MOVE_FORWARD:[0,0,-1],
    MOVE_BACKWARD:[0,0,1],
}

const BOUNDS ={minX:-4, maxX:4 , minZ:-3,maxZ:3}
const STEP =0.9
const DRONE_SCALE=0.2
const FLOOR_Y = -0.5
const STEP_MS =300
const STOP_COMMANDS = new Set(["HOVER","LAND","EMERGENCY_STOP"])

const WAYPOINTS=[
    {x:2, z:-2,label:"Right loop:front"},
    {x:3, z:0,label:"Right loop:outside"},
    {x:2, z:2,label:"Right loop:back"},
    {x:0, z:0,label:"Cross the center"},
    {x:-2, z:-2,label:"Left loop:front"},
    {x:-3, z:0,label:"Left loop:outside"},
    {x:-2, z:2,label:"Left loop:back"},
    {x:0, z:0,label:"Return to center"},

]


const MARKERS =[
    {x: -2, z:0, label:"Marker A"},
    {x: 2, z: 0, label : "Marker B"},
]

const clamp = (v, lo , hi) => Math.min(hi,Math.max(lo,v))
const toWorld = (gx,gz) => new THREE.Vector3(gx * STEP,0,gz * STEP)

const CURVE_POINTS =128
const figureEightPoints = () => 
    Array.from({ length: CURVE_POINTS +1 }, (_,i) => {
        const t = (i/ CURVE_POINTS) * Math.PI * 2
        return new THREE.Vector3(3 * Math.sin(t) * STEP,0 , -2 * Math.sin(2*t) * STEP)
    })
export default function FigureEightSim ({ running, onComplete}) {
    const {theme} = useTheme()
    const mountRef = useRef(null)
    const droneRef = useRef(null)
    const targetRef = useRef(new THREE.Vector3(0,0,0))
    const mats = useRef({frame: null , red: null,rings:[] , markers:[], legs:[] ,grid:null })

    const posRef = useRef({x:0 , z:0 })
    const idxRef = useRef(0)
    const runningRef = useRef(running)
    const doneRef = useRef(false)
    const dirRef = useRef(null)
    const lastStepRef = useRef(0)

    const[idx,setIdx] = useState(0)
    const [lastCmd,setLastCmd] = useState(null)
    const[moves,setMoves] = useState(0)
    const [moving,setMoving] =useState(null)
    const done = idx >= WAYPOINTS.length

    useEffect(() => {
        runningRef.current = running
    },[running])

    const stop = useCallback(() => {
        dirRef.current = nullsetMoving(null)
    },[])

    const step = useCallback(
        (delta) => {
            const cur = posRef.current
            const next = {
                x: clamp(cur.x + delta[0], BOUNDS.minX, BOUNDS.maxX),
                z: clamp(cur.z + delta[2], BOUNDS.minZ, BOUNDS.maxZ),
            }

            if (next.x === cur.x && next.z === cur.z) return false

            posRef.current = next
            lastStepRef.current = performance.now()
            targetRef.current.copy(toWorld(next.x, next.z))
            setMoves((m) => m +1)


            const wp = WAYPOINTS[idxRef.current]
            if(wp && wp.x === next.x && wp.z === next.z) {
                idxRef.current += 1
                setIdx(idxRef.current)
                if (idxRef.current >= WAYPOINTS.length) {
                    doneRef.current = true
                    onComplete?.()
                    return false

                }
            }
            return true
        },
        [onComplete]
    )

    const handleCommand = useCallback(
        (event) => {
            if(!runningRef.current || doneRef.current) return
            setLastCmd(commandLabel(event.command))

            if (STOP_COMMANDS.has(event.command)){
                stop()
                return
            }

            const delta = STEP_DELTA[event.command]
            if (!delta) return

            dirRef.current = delta
            setMoving(commandLabel(event.command))
            if (!step(delta)) stop()
        },
        [step,stop]
    )


    const {live} = useGestureCommands(handleCommand)

    useEffect(() => {
        if (!running) return undefined
        const id = setInterval(() => {
            const dir = dirRef.current
            if (!dir || doneRef.current) return
            if(performance.now() - lastStepRef.current < STEP_MS) return
            if (!step(dir)) stop()
        },50)
    return () => {
        clearInterval(id)
        dirRef.current = null
    }
    }, [running, step, stop])

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

    const props = []
    const rotorGeo = new THREE.TorusGeometry(0.52,0.035,6,26)
    const bladeGeo = new THREE.BoxGeometry(0.95,0.015,0.07)

    const d = 1.06

    ;[[d,d], [d,-d], [-d,d] , [-d,-d]].forEach(([px , pz]) => {
        const ring = new THREE.Mesh(rotorGeo , red)
        ring.rotation.x = Math.PI /2
        ring.position.set(px,0.22,pz)
        drone.add(ring)
        const prop = new THREE.Group()
        const b1 = new THREE.Mesh(bladeGeo,frame)
        const b2 = b1.clone()
        b2.rotation.y = Math.PI / 2
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

    drone.scale.setScalar(0.32)
    scene.add(drone)
    droneRef.current = drone

    const ringGeo = new THREE.TorusGeometry(0.32,0.02,6,28)
    mats.current.rings = WAYPOINTS.map((wp) => {
        const m = new THREE.MeshBasicMaterial({ transparent: true})
        const mesh = new THREE.Mesh(ringGeo, m)
        mesh.position.copy(toWorld(wp.x,wp.y,wp.z))
        scene.add(mesh)
        return {mesh,m}
    })


    const markerGeo = new THREE.CylinderGeometry(0.18,0.18,2.6,10,1,true)
    mats.current.markers = MARKERS.map((mk) => {
        const m = new THREE.MeshBasicMaterial({wireframe: true, transparent:true, opacity:0.8})
    


    const mesh = new THREE.Mesh(markerGeo, m )
    const world = toWorld(mk.x,1,mk.z)
    mesh.position.set(world.x,world.y,world.z)
    scene.add(mesh)
    return { mesh, m}
})

const resize = () => {
    const w = Math.max(1,mount.clientWidth)
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
    const vz = drone.position.z - prev.z
    if (!reduced) {
        drone.position.y += Math.sin(t * 1.7) * 0.002
        drone.rotation.z = THREE.MathUtils.lerp(drone.rotation.z, -vx * 6, 0.12)
        drone.rotation.x = THREE.MathUtils.lerp(drone.rotation.x, vz * 6 , 0.12)
        void vy 
        props.forEach((pr, i) => (pr.rotation.y += 0.55 + i * 0.03))
        const current = mats.current.rings[idxRef.current]
        if(current) current.mesh.scale.setScalar(1+ Math.sin(t * 4) * 0.06)
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
}

raf = requestAnimationFrame(tick)


return() => {
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
        const dim = css.getPropertyValue("--dim").trim()


        mats.current.frame?.color.set(ink)
        mats.current.red?.color.set(redToken) 
        mats.current.markers.forEach(({m}) => m.color.set(dim))
        mats.current.rings.forEach(({m , mesh}, i) => {
            mesh.scale.setScalar(1)
            if ( i === idx) {
                m.color.set(redToken)
                m.opacity = 1
            }else{
                m.color.set(ink)
                m.opacity = i < idx ? 0.12 :0.35
            }
        })
    })
    return () => cancelAnimationFrame(raf)
},[theme, idx])

const linkLive = status === "open"
const current = WAYPOINTS[idx]


return (
    <div className="relative flex-1 min-h-0 rounded-lg border border-glassBrd bg-surface overflow-hidden">
        <div ref={mountRef} className="absolute inset-0" aria-hidden="true"/>

        <div className="absolute top-3 left-3 right-3 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-dim font-mono">
                Step {Math.min(idx + 1,WAYPOINTS.length)} / {WAYPOINTS.length}
            </span>

            <span className="text-sm font-semibold text-ink flex items-center gap-2">
                {done ? (
                    <>
                    <CheckCircle2 className="w-4 h-4 text-success"/> Figure-8 Complete
                    </>
                ):(
                    current?.label
                )}
            </span>
            <div className="flex gap-1">
                {WAYPOINTS.map((wp,i) => (
                    <span
                    key={wp.label + i}
                    className={`h-1 flex-1 rounded-full ${
                        i < idx ? "bg-red" : i === idx ? "bg-ink" : "bg-line"
                    }`}
                    />
                ))}
            </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 font-mono text-xs text-dim">
            <div className="flex flex-col gap-0.5">
                <span>Last command: {lastCmd ?? "none yet"}</span>
                <span>Moves: {moves}</span>
            </div>
            <span className={linkLive ? "text-ink" : "text-dim"}>
                {linkLive ? "Gesture link live" : "Connecting to gestures"}
            </span>
        </div>

        {(!running || done) && (
            <div className="absolute inset-x-0 top-20 flex justify-center pointer-events-none">
                <span className="rounded-full border border-glassBrd bg-glass px-3 py-1 text-xs text-ink">
                    {done ? "Module complete" : "Press Start Exercise to begin"}
                </span>
            </div>

        )}
    </div>
)
}

FigureEightSim.propTypes = {
    running: PropTypes.bool,
    onComplete: PropTypes.func,
}

FigureEightSim.defaultProps = {
    running: false,
    onComplete: undefined,
}





