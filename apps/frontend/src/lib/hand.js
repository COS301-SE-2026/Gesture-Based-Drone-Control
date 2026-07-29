//hand skeleton

import { X } from "lucide-react"

export const WRIST =[110,218]

export const FINGERS=[
    {base: [64,170],segs:[30,26,20]},
    {base: [78,128],segs:[34,27,20]},
    {base: [103,122],segs:[38,30,22]},
    {base: [128,126],segs:[34,28,20]},
    {base: [150,134],segs:[26,20,15]},
]

export const POSES =[
    //get the real ones from shav later today...these are just placeholders for now
    //open palm = hover
    [
        {c:0.12, s:-0.72},
        {c:0.0, s:0.16},
        {c:0.0, s:-0.2},
        {c:0.0, s:0.12},
        {c:0.0, s:0.28},
    ],

    //index - up
    [
        {c:0.85, s:-0.45},
        {c:0.0, s:0.05},
        {c:1.0, s:0.0},
        {c:1.0, s:0.08},
        {c:1.0, s:0.16},
        
    ],

    //v sign = orbit
    [
        {c:0.9, s:-0.4},
        {c:0.03, s:-0.26},
        {c:0.03, s:0.14},
        {c:1.0, s:0.1},
        {c:1.0, s:0.18},

    ],

    //fist - land
    [
        {c:0.95, s:-0.35},
        {c:1.0, s:-0.08},
        {c:1.0, s:0.0},
        {c:1.0, s:0.08},
        {c:1.0, s:0.16},
    ],
]

export const clamp01 =(x) => Math.min(1,Math.max(0,x))

export function digitJoints(spec,d){
    let dir = -Math.PI/2 + d.s
    let[x,y]= spec.base
    const pts=[[x,y]]
    for(let i=0; i< spec.segs.length; i++){
        dir += d.c * (i === 0? 0.85 : 1.05)
        const len = spec.segs[i] * (1 - d.c * 0.12)
        x += Math.cos(dir) * len
        y += Math.sin(dir) * len
        pts.push([x, y])
    }

    return pts
}