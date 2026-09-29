import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import * as THREE from "three"
import { CheckCircle2, CIrcle, CircleDot } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useGestureCommands } from "@/hooks/useGestureCommands";
import { commandLabel } from "@/constants/GestureCommands";
import { request } from "node:http";

const STEP_DELTA = {
    MOVE_UP: [0,1,0],
    MOVE_DOWN: [0,-1,0],
    MOVE_LEFT: [-1,0,0],
    MOVE_RIGHT: [1,0,0],
    MOVE_FORWARD: [0,0,-1],
    MOVE_BACKWARD: [0,0,1],
}

const BOUNDS = { minX: -3, maxX: 3, minY: -2, maxY:2, minZ: -12, maxZ:0}
const XY_STEP = 0.8
const Z_STEP =0.8
const WALL_DEPTH = 0.12
const DRONE_SCALE = 0.22

const WALLS = [
    {z: -3, hole: { x: -2, y:1}, label: "Clear wall 1"},
    {z: -6, hole: {x: 2, y:-1}, label: "Clear wall 2"},
    {z: -9, hole: {x: 0, y: 2}, label: "Clear wall 3"},
]

const FINISH_Z = BOUNDS.minZ
const STEPS = [...WALLS.map((w) => w.label), "Reach the finish gate"]

const STEP_MS = 300 //how far drone goes in one move
const STOP_COMMANDS = new Set(["HOVER", "LAND", "EMERGENCY_STOP"])

const clamp = (v, lo, hi) = Math.min(hi, Math.max(lo,v))
const toWorld = (gx, gy,gz) => new THREE.Vector3(gx*XY_STEP, gy*XY_STEP, gz*Z_STEP)

const blockingWall = (p) => 
    WALLS.findIndex( (w) => w.z === p.z && (w.hole.x !== p.x || w.hole.y !== p.y))

function buildDrone(frame, red, geos) {
    const drone = new THREE.Group()
    const bodyGeo = new THREE.BoxGeometry(1.35, 0.42, 1.35, 2, 1, 2)
    const canopyGeo = new THREE.BoxGeometry(0.6, 0.28, 0.9, 1,1,1)
    const armGeo = new THREE.BoxGeometry(3.0, 0.1, 0.12)
    const rotorGeo = new THREE.TorusGeometry(0.52, 0.036, 6, 26)
    const bladeGeo = new THREE.BoxGeometry(0.95, 0.015, 0.07)
    const legGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06)
    geos.push(bodyGeo, canopyGeo, armGeo, rotorGeo, bladeGeo, legGeo)

    drone.add(new THREE(bodyGeo, frame))
    const armA = new THREE.Mesh(armGeo, frame)
    armA.rotation.y = Math.PI / 4
    const armB = armA.clone()
    armB.rotation.y = -Math.PI / 4
    drone.add (armA, armB)

    const props = []
    const d = 1.06
    ;[[d,d], [d,-d], [-d,d], [-d,-d]].forEach(([px , pz]) => {
        const ring = new THREE.Mesh(rotorGeo, red)
        ring.rotation.x = Math.PI/2
        ring.position.set(px,0.22, pz)
        drone.add(ring)
        const prop = new THREE.Group()
        const b1 = new THREE.Mesh(bladeGeo, frame)
        const b2 = b1.clone()
        b2.rotation.y = Math.PI /2
        prop.add(b1,b2)
        prop.position.set(px,0,24,pz)
        drone.add(prop)
        props.push(prop)
    })

    ;[-0.45, 0.45].forEach( (lx) => {
        const leg = new THREE.Mesh(legGeo, frame)
        leg.position.set(lx, -0.42,0)
        drone.add (leg)
    })

    drone.scale.setScalar(DRONE_SCALE)
    return { drone, props }
}

function buildWall(wall, fill, line, holeMat, geos){
    const group = new THREE.Group()
    const S = XY_STEP
    const left = (BOUNDS.minX -0.5) *S
    const right = (BOUNDS.maxX +0.5) *S
    const bottom = (BOUNDS.minY -0.5) *S
    const top = (BOUNDS.maxY +0.5) *S
    const hx0= (wall.hole.x -0.5) *S
    const hx1 = (wall.hole.x +0.5) * S
    const hy0 = (wall.hole.y -0.5) *S
    const hy1 = (wall.hole.y +0.5) *S

    const addSlab = (x0,x1,y0,y1) =>
    {
        const w = x1-x0
        const h = y1-y0

        if (w <=0 || h<=0) return
        const geo = new THREE.BoxGeometry(w,h, WALL_DEPTH)
        const edges = new THREE.EdgesGeometry(geo)
        geos.push(geo,edges)

        const slab = new THREE.Mesh(geo,fill)
        slab.position.set(x0 + w /2, y0 + h/2,0)
        const outline = new THREE.LineSegments(edges,line)
        outline.position.copy(slab.position)
        group.add(slab, outline)
    }

    addSlab(left, hx0, bottom,top)
    addSlab(hx1, right, bottom, top)
    addSlab(hx0, hx1, bottom, hy0)
    addSlab(hx0, hx1, hy1, top)

    const holeGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(hx0, hy0, WALL_DEPTH/2+0.01),
        new THREE.Vector3(hx1, hy0, WALL_DEPTH/2+0.01),
        new THREE.Vector3(hx1, hy1, WALL_DEPTH/2+0.01),
        new THREE.Vector3(hx0, hy1, WALL_DEPTH/2+0.01),
    ])
    geos.push(holeGeo)
    group.add(new THREE.LineLoop(holeGeo.holeMat))

    group.position.z = wall.z * Z_STEP
    return group
}

export default function ObstacleBlocksSim({ running, onComplete }){

    const { theme } = useTheme()
    const mountRef = useRef(null)
    const targetRef = useRef(new THREE.Vector3(0,0,0))
    const mats = useRef({ frame: null, red: null, walls: [], finish: null, grid: null})

    const posRef = useRef({x: 0, y:0, z: 0})
    const idxRef = useRef(0)
    const runningRef = useRef(running)
    const doneRef = useRef(false)
    const bumpRef = useRef(0)
    const flashTimerRef = useRef(null)
    const dirRef = useRef(null)
    const lastStepRef = useRef(0)

    const [idx, setIdx] = useState(0)
    const [lastCmd, setLastCmd] = useState(null)
    const [moves, setMoves] = useState(0)
    const [bumps, setBumps] = useState(0)
    const [flash, setFlash] = useState(null)
    const [moving, setMoving] = useState(null)
    const done = idx >= STEPS.length

    useEffect( () => {
        runningRef.current = running
    }, [running])

    useEffect(() => () => clearTimeout(flashTimerRef.current), [])

    const showFlash = useCallback((msg) => {
        setFlash(msg)
        clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlash(null), 1200)
    }, [])

    const stop = useCallback(() => {
        dirRef.current = null
        setMoving(null)
    },[])

    const step = useCallback(
        (delta) => {
            const cur = posRef.current
            const next = {
                x: clamp(cur.x + delta[0], BOUNDS.minX, BOUNDS.maxX),
                y: clamp(cur.y + delta[0], BOUNDS.minY, BOUNDS.maxY),
                z: clamp(cur.z + delta[0], BOUNDS.minZ, BOUNDS.maxZ)
            }

            if (next.x === cur.x && next.y === cur.y && next.z === cur.z) return false

            const hit = blockingWall(next)
            if (hit !== -1){
                setBumps((b) => b+1)
                bumpRef.current = performance.now()
                showFlash(`Hit wall ${hit+1}`)
                return false
            }

            posRef.current = next
            lastStepRef.current = performance.now()
            targetRef.current.copy(toWorld(next.x, next.y, next.z))
            setMoves((m) => m+1)

            let i = idxRef.current
            while (i<WALLS.length && next.z < WALLS[i].z) i+=1
            if (i=== WALLS.length && next.z <= FINISH_Z) i = STEPS.length

            if (i !== idxRef.current){
                idxRef.current = i
                setIdx(i)
                if (i >= STEPS.length){
                    doneRef.current = true
                    onComplete?.()
                    return false
                }
            }
            return true

        }, [onComplete, showFlash])

        const handleCommand = useCallback( (event) =>
        {
            if (!runningRef.current || doneRef.current) return

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
        }, [step, stop])

        const { live } = useGestureCommands(handleCommand)

        useEffect( () => {
            if (!running){
                stop()
                return undefined
            }
            const id = setInterval (() => {
                const dir = dirRef.current
                if (!dir || doneRef.current) return

                if (performance.now() - lastStepRef.current < STEP_MS) return
                if (!step(dir)) stop()
            }, 50)
        return () => clearInterval(id)
        }, [running, step, stop])

        useEffect( () => {
            const mount = mountRef.current
            if (!mount) return 
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
            const geos = []
            const materials = []

            const scene = new THREE.Scene()
            const camera = new THREE.PerspectiveCamera(55,1,0.1,100)
            camera.position.set(0,1.2,3.6)

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true})
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            mount.appendChild(renderer.domElement)

            const frame = new THREE.MeshBasicMaterial({wireframe: true, transparent:true, opacity: 0.9})
            const red = new THREE.MeshBasicMaterial({wireframe:true})
            mats.current.frame = frame
            mats.current.red = red
            materials.push(frame, red)

            const { drone, props }= buildDrone(frame, red, geos)
            scene.add(drone)

            mats.current.walls = WALLS.map((wall) => {
                const fill = new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, side: THREE.DoubleSide})
                const line = new THREE.LineBasicMaterial({transparent: true})
                const hole = new THREE.LineBasicMaterial({transparent: true})
                materials.push(fill, line, hole)
                scene.add(buildWall(wall, fill, line, hole, geos))
                return{fill, line, hole}
            })

            const S = XY_STEP
            const fz = FINISH_Z * Z_STEP
            const finishGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3((BOUNDS.minX-0.5) *S, (BOUNDS.minY-0.5) *S, fz),
                new THREE.Vector3((BOUNDS.maxX+0.5) *S, (BOUNDS.minY-0.5) *S, fz),
                new THREE.Vector3((BOUNDS.maxX+0.5) *S, (BOUNDS.maxY+0.5) *S, fz),
                new THREE.Vector3((BOUNDS.minX-0.5) *S, (BOUNDS.maxY+0.5) *S, fz),
            ])
            const finish = new THREE.LineBasicMaterial({ transparent: true })
            geos.push(finishGeo)
            materials.push(finish)
            mats.current.finish = finish
            scene.add(new THREE.LineLoop(finishGeo, finish))

            const courseLen = (BOUNDS.maxZ - BOUNDS.minZ) *Z_STEP+2
            const grid = new THREE.GridHelper(courseLen, 16, 0xffffff, 0xffffff)
            grid.material.transparent = true
            grid.position.set(0, (BOUNDS.minY-0.5) * S -0.05, -courseLen/2 +1)
            geos.push(grid.material)
            mats.current.grid = grid.material 
            scene.add(grid)

            const resize = () => {
                const w = Math.max(1, mount.clientWidth)
                const h = Math.max(1, mount.clientHeight)
                camera.aspect = w/h
                camera.updateProjectionMatrix()
                renderer.setSize(w,h)
            }

            resize()
            const ro = new ResizeObserver(resize)
            ro.observer(mount)

            let raf = 0
            let t =0
            const prev = new THREE.Vector3()
            const camGoal = new THREE.Vector3()
            const look = new THREE.Vector3()

            const tick = () => {
                t += 0.016
                prev.copy(drone.position)
                drone.position.lerp(targetRef.current, reduced ? 1: 0.12)
                const vx = drone.position.x - prev.x
                const vy = drone.position.y - prev.y
                const vz = drone.position.z - prev.z

                if (!reduced){
                    drone.position.y += Math.sin(t * 1.7) * 0.002
                    drone.rotation.z = THREE.MathUtils.lerp(drone.rotation.z, -vx * 6, 0.12)
                    drone.rotation.x = THREE.MathUtils.lerp(drone.rotation.x, vz * 5 - vy * 4, 0.12)
                    props.forEach((pr, i) => (pr.rotation.y += 0.55 + i * 0.03))

                    const sinceBump = performance.now() - bumpRef.current
                    if (sinceBump < 350){
                        drone.position.x += Math.sin(sinceBump * 0.09) * 0.03
                    }
                }

                camGoal.set(drone.position.x *0.5, drone.position.y * 0.5 + 1.2, drone.position.z + 3.6)
                camera.position.lerp(camGoal, reduced ? 1 : 0.08)
                look.set(drone.position.x *0.5, drone.position.y * 0.5, drone.position.z -3)
                camera.lookAt(look)

                renderer.render(scene, camera)
                raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)

            return () => {
                cancelAnimationFrame(raf)
                ro.disconnect()
                geos.forEach((m) => m.dispose())
                renderer.dispose()
                if (renderer.domElement.parentNode === mount) renderer.domElement.remove()
            }
        }, [])

}