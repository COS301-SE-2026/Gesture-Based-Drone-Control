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

