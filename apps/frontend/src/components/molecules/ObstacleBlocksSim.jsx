import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import * as THREE from "three"
import { CheckCircle2, CIrcle, CircleDot } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useGestureCommands } from "@/hooks/useGestureCommands";
import { commandLabel } from "@/constants/GestureCommands";

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