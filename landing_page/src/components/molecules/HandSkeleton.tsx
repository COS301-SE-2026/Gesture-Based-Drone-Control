import { Digit, FINGERS, WRIST, digitJoints } from "../../lib/hand"
import "./HandSkeleton.css"

interface Props {
  pose: Digit[]
  sway?: number
  bob?: number
}

//Pipeline hand type layout, drawn from forawrd kinematics
export default function HandSkeleton({
  pose,
  sway = 0,
  bob = 0,
}: Readonly<Props>) {
  const fingers = FINGERS.map((f, i) => digitJoints(f, pose[i]))
  const bases = FINGERS.map((f) => f.base)
  // fist extends nothing, whole fist is the signal
  let hot = pose.map((d) => d.c < 0.35)
  if (!hot.some(Boolean)) hot = hot.map(() => true)

  return (
    <svg
      className="md-handsvg"
      viewBox="0 0 220 250"
      role="img"
      aria-label="Hand landmark skeleton showing the current gesture"
    >
      <g
        transform={
          "translate(0 " +
          bob.toFixed(2) +
          ") rotate(" +
          sway.toFixed(2) +
          " 110 175)"
        }
      >
        {/* palm web */}
        {bases.map((b, i) => (
          <line
            key={"w" + i}
            className="md-bone md-bone-dim"
            x1={WRIST[0]}
            y1={WRIST[1]}
            x2={b[0]}
            y2={b[1]}
          />
        ))}
        {bases
          .slice(1)
          .map((b, i) =>
            i < 3 ? (
              <line
                key={"k" + i}
                className="md-bone md-bone-dim"
                x1={b[0]}
                y1={b[1]}
                x2={bases[i + 2][0]}
                y2={bases[i + 2][1]}
              />
            ) : null
          )}
        {/* fingurs */}
        {fingers.map((pts, fi) =>
          pts
            .slice(1)
            .map((pt, i) => (
              <line
                key={fi + "-" + i}
                className={
                  "md-bone " + (hot[fi] ? "md-bone-hot" : "md-bone-cold")
                }
                x1={pts[i][0]}
                y1={pts[i][1]}
                x2={pt[0]}
                y2={pt[1]}
              />
            ))
        )}
        {/* joints */}
        <circle className="md-joint" cx={WRIST[0]} cy={WRIST[1]} r="5" />
        {fingers.map((pts, fi) =>
          pts.map((pt, i) => (
            <circle
              key={"j" + fi + "-" + i}
              className={
                (i === pts.length - 1 ? "md-joint md-tip" : "md-joint") +
                (hot[fi] ? "" : " md-joint-cold")
              }
              cx={pt[0]}
              cy={pt[1]}
              r={i === pts.length - 1 ? (hot[fi] ? 4.6 : 3.6) : 3.2}
            />
          ))
        )}
      </g>
    </svg>
  )
}
