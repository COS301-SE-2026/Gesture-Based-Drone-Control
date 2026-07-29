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
    //open palm
    [
        {c:0.12, s:-0.62},//thumb
        {c:0.0, s:-0.20},//index
        {c:0.0, s:0.0},//middle
        {c:0.0, s:0.12},//ring
        {c:0.0, s:0.28},//pinky
    ],

    //index
    [
        {c:0.9, s:-0.55},
        {c:0.0, s:-0.05},
        {c:1.0, s:0.05},
        {c:1.0, s:0.15},
        {c:1.0, s:0.30},
        
    ],

    //v sign
    [
        {c:0.9, s:-0.55},
        {c:0.02, s:-0.15},
        {c:0.02, s:0.15},
        {c:1.0, s:0.20},
        {c:1.0, s:0.35},
    ],

    //fist 
    [
        {c:0.9, s:-0.45},
        {c:1.0, s:-0.10},
        {c:1.0, s:0.05},
        {c:1.0, s:0.15},
        {c:1.0, s:0.30},
    ],
    //three fingers takkeoff
    [ 
        {c:0.9, s:0.02},
        {c:0.03, s:-0.15},
        {c:0.03, s:0.0},
        {c:0.03, s:0.15},
        {c:1.0, s:2.0},

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