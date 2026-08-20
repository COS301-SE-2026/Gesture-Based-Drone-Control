import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

/**
 * maps an altitude val to colour on a dim to birght green scale depending on how high it is,
 * normalized again the min/max altitude seen in the current path
 *
 */

function getCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

function altitudeToColour(altitude, minAlt, maxAlt, pathColour) {
  const range = maxAlt - minAlt
  const t = range > 0.05 ? (altitude - minAlt) / range : 0.5
  const opacity = 0.35 + t * 0.65 //25% is dim/drone is low, 85% is bright/drone is higher
  return { color: pathColour, opacity }
}

function createDroneIcon(headingDeg = 0, markerColour = "#f5f3f4") {
  return L.divIcon({
    className: "drone-marker",
    html: `<div style="transform: rotate(${headingDeg}deg); font-size: 22px; line-height: 1; color: ${markerColour};">▲</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

//forces leaflet to recompute the maps pixel size after container has settled
//fitbounds sometimes runs against stale/zero vals on first paint so to fix the "thick line"
//i hope and pray this works
function MapReady() {
  const map = useMap()
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize()
    })
    return () => cancelAnimationFrame(id)
  }, [map])
  return null
}

/**
 * keeps map panned to follow the drones current position
 * must live in the mapContainer to access the map instance via useMap()
 *
 * fitBounds is just for making the map fit the disp
 */
function FitBounds({ points }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current || points.length === 0) return

    try {
      if (points.length === 1) {
        //1 point has no bounds to fit
        map.setView(points[0], 0)
      } else {
        const bounds = L.latLngBounds(points)
        map.fitBounds(bounds, { padding: [60, 60], animate: false })
      }
      fitted.current = true
    } catch {
      //map not ready/valid yet
    }
    return () => {
      try {
        map.stop()
      } catch {
        //already torn down during unmount
      }
    }
  }, [points, map])

  return null
}

FitBounds.propTypes = {
  points: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
}

function FollowDrone({ position }) {
  const map = useMap()
  useEffect(() => {
    if (
      position &&
      Number.isFinite(position[0]) &&
      Number.isFinite(position[1])
    ) {
      try {
        map.panTo(position, { animate: true })
      } catch {
        //map container mid-teardown or not yet sized
      }
    }
    return () => {
      try {
        map.stop()
      } catch {
        //map/container already torn down during unmount
      }
    }
  }, [position, map])
  return null
}

FollowDrone.propTypes = {
  position: PropTypes.arrayOf(PropTypes.number),
}

FollowDrone.defaultProps = {
  position: null,
}

/**
 * the leaflet map is in CRS.Simple mode (mening there wont be any real world tiles or gps coords since the scope is indoors)
 * it shows the flight path as altitude coloured segments and a live marker of the drones current position, if its rotated
 *
 * pathpoints is an arr of x_displacement, y_displacement and altitude_m -> ordered oldest to newest
 * headingDeg is the currunt heading direction and used to rotate the drone marker since leaflet doesnt do orientation
 */

export default function DroneMap({ pathPoints, headingDeg, height }) {
  // const { isDark } = useContext(ThemeContext)
  // const mapRef = useRef(null)

  const pathColour = getCssVar("--red", "#e5383b")

  const markerColour = getCssVar("--ink", "#f5f3f4")

  const altitudes = pathPoints
    .map((p) => p.altitude_m)
    .filter((a) => Number.isFinite(a))
  if (pathPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-dim/20 rounded-lg text-dim"
        style={{ height }}
      >
        Waiting for telemetry...
      </div>
    )
  }
  const minAltitude = Math.min(...altitudes)
  const maxAltitude = Math.max(...altitudes)
  const displacementPoints = pathPoints
    .filter(
      (p) =>
        Number.isFinite(p.x_displacement) && Number.isFinite(p.y_displacement)
    )
    .map((p) => [p.y_displacement, p.x_displacement])
  if (displacementPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-dim/20 rounded-lg text-dim"
        style={{ height }}
      >
        Waiting for telemetry...
      </div>
    )
  }
  const currPos = displacementPoints[displacementPoints.length - 1]

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        center={[0, 0]}
        zoom={0}
        minZoom={-5}
        // zoomSnap={0.25}
        // zoomDelta={0.25}
        scrollWheelZoom={true}
        className="h-full w-full bg-bg"
      >
        {pathPoints.slice(1).map((point, i) => {
          const { color, opacity } = altitudeToColour(
            point.altitude_m,
            minAltitude,
            maxAltitude,
            pathColour
          )
          const isNewest = i === pathPoints.length - 2
          return (
            <Polyline
              key={`polyline-${i}`}
              positions={[displacementPoints[i], displacementPoints[i + 1]]}
              pathOptions={{
                color,
                opacity,
                weight: 6,
                //only most recent segment plays the draw-in animation,
                //so rerending older segments doesnt replay every frame
                className: isNewest ? "md-path-segment" : undefined,
              }}
            />
          )
        })}
        <Marker
          position={currPos}
          icon={createDroneIcon(headingDeg, markerColour)}
        />
        <FollowDrone position={currPos} />
        <FitBounds points={displacementPoints} />
        <MapReady />
      </MapContainer>
    </div>
  )
}

DroneMap.propTypes = {
  pathPoints: PropTypes.arrayOf(
    PropTypes.shape({
      x_displacement: PropTypes.number.isRequired,
      y_displacement: PropTypes.number.isRequired,
      altitude_m: PropTypes.number.isRequired,
    })
  ),
  headingDeg: PropTypes.number,
  height: PropTypes.string,
}

DroneMap.defaultProps = {
  pathPoints: [],
  headingDeg: 0,
  height: "400px",
}
