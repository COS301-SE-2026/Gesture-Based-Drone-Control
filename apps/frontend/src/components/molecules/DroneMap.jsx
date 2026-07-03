import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useContext } from "react"
import { ThemeContext } from "../../context/ThemeContext"

/**
 * maps an altitude val to colour on a dim to birght green scale depending on how high it is,
 * normalized again the min/max altitude seen in the current path
 *
 */
const PATH_COLOUR = "#A4161A"
function altitudeToColour(altitude, minAlt, maxAlt) {
  const range = maxAlt - minAlt
  const t = range > 0.05 ? (altitude - minAlt) / range : 0.5
  const opacity = 0.35 + t * 0.65 //25% is dim/drone is low, 85% is bright/drone is higher
  return { color: PATH_COLOUR, opacity }
}

function createDroneIcon(headingDeg = 0, isDark = false) {
  const markerColour = isDark ? "#F5F3F4" : "#161A1D"
  return L.divIcon({
    className: "drone-marker",
    html: `<div style="transform: rotate(${headingDeg}deg); font-size: 22px; line-height: 1; color: ${markerColour};">▲</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
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
    if (!fitted.current && points.length > 0) {
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, { padding: [60, 60] })
      fitted.current = true
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
    if (position) map.panTo(position, { animate: true })
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
  const { isDark } = useContext(ThemeContext)
  // const mapRef = useRef(null)

  if (pathPoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-OffBlack/20 rounded-lg text-DarkGrey"
        style={{ height }}
      >
        Waiting for telemtry...
      </div>
    )
  }

  const altitudes = pathPoints.map((p) => p.altitude_m)
  const minAltitude = Math.min(...altitudes)
  const maxAltitude = Math.max(...altitudes)
  const displacementPoints = pathPoints.map((p) => [
    p.y_displacement,
    p.x_displacement,
  ])
  const currPos = displacementPoints[displacementPoints.length - 1]

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        center={[0, 0]}
        zoom={0}
        minZoom={-5}
        className="h-full w-full bg-[#F5F3F4] dark:bg-[#161A1D]"
      >
        {pathPoints.slice(1).map((point, i) => {
          const { color, opacity } = altitudeToColour(
            point.altitude_m,
            minAltitude,
            maxAltitude
          )
          return (
            <Polyline
              key={i}
              positions={[displacementPoints[i], displacementPoints[i + 1]]}
              pathOptions={{ color, opacity, weight: 6 }}
            />
          )
        })}
        <Marker position={currPos} icon={createDroneIcon(headingDeg, isDark)} />
        <FollowDrone position={currPos} />
        <FitBounds points={displacementPoints} />
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
