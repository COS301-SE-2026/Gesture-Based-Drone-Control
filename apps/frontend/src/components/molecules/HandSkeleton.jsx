import PropTypes from "prop-types"
import {FINGERS,WRIST,digitJoints} from "../../lib/hand"

const RED = "#A4161A"
const DIM = "#B1A7A6"
const INK = "#161A1D"

export default function HandSkeleton ({ pose,sway=0 , bob= 0}) {
    const fingers = FINGERS.map((f,i) => digitJoints(f,pose[i]))
    const bases = FINGERS.map((f) => f.base)
    let hot = pose.map((d) => d.c < 0.35)
    if (!hot.some(Boolean)) hot = hot.map(() => true)

    return(
        <svg
            viewBox ="0 0 220 250"
            className ="w-full h-full max-h-[58vh]"
            role="img"
            aria-label ="Hand landmark skeleton showing the current gesture"
        >
            <g 
                transform={`translate(0 ${bob.toFixed(2)}) rotate(${sway.toFixed(2)} 110 175)`}
            >
                {bases.map((b,i)=>(
                    <line   
                        key = {"w"+i}
                        x1 ={WRIST[0]}
                        y1 ={WRIST[1]}
                        x2={b[0]}
                        y2={b[1]}
                        stroke ={DIM}
                        strokeWidth={2}
                        strokeLinecap="round"
                        opacity={0.55}
                        />
                ))}

                {bases.slice(1).map((b,i) =>
                i < 3 ? (
                    <line
                        key={"k" +i}
                        x1={b[0]}
                        y1={b[1]}
                        x2={bases[i+2][0]}
                        y2={bases[i+2][1]}
                        stroke={DIM}
                        strokeWidth={2}
                        strokeLinecap="round"
                        opacity={0.55}
                        />
                ) :null
                )}

                {fingers.map((pts,fi) =>
                pts.slice(1).map((pt,i)=>(
                    <line
                    key ={fi + "-"+i}
                    x1={pts[i][0]}
                    y1={pts[i][1]}
                    x2={pt[0]}
                    y2={pt[1]}
                    stroke={hot[fi] ? RED :DIM}
                    strokeWidth={hot[fi]? 4.4:2}
                    strokeLinecap="round"
                    opacity={hot[fi]? 1:0.35}
                    style={hot[fi] ? {filter:"drop-shadow(0 0 6px #ef4444aa"} : undefined}
                    />

                ))
                )}
                <circle cx = {WRIST[0]} cy={WRIST[1]} r="5" fill={INK} />
                {fingers.map((pts,fi) =>
                pts.map((pt, i) => {
                    const isTip = i === pts.length -1
                    return(
                        <circle
                            key = {"j"+fi+"-"+i}
                            cx={pt[0]}
                            cy={pt[1]}
                            r={isTip ? (hot[fi]? 4.6 :3.6):3.2}
                            fill={isTip?RED:INK}
                            opacity={hot[fi] ? 1:0.35}
                            />
                    )
                })
                )} 
            </g>
        </svg>
        
    )
}

HandSkeleton.propTypes ={
    pose:PropTypes.arrayOf(
        PropTypes.shape({c:PropTypes.number.isRequired, s:PropTypes.number.isRequired})
    ).isRequired,
    sway: PropTypes.number,
    bob:PropTypes.number,
}