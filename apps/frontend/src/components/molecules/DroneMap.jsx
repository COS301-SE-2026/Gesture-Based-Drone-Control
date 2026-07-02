import { useEffect, useRef } from "react"
import PropTypes from "prop-types"
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/deaflet.css"

/**
 * maps an altitude val to colour on a dim to birght green scake depending on how high it is,
 * normalized again the min/max altitude seen in the current path
 *
 */

function altitudeToColour(altitude, minAlt, maxAlt) {
  const range = maxAlt - minAlt
  const t = range > 0.05 ? (altitude - minAlt) / range : 0.5
  const lightness = 25 + t * 60 //25% is dim/drone is low, 85% is bright/drone is higher
  return `hsl(140, 70%, ${lightness}%)`
}

function createDroneIcon(headingDeg = 0) {
  return L.divIcon({
    className: "drone-marker",
    html: `<div style="transform: rotate(${headingDeg}deg); font-size: 22px; line-height: 1;">o</div`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

/**
 * keeps map panned to follow the drones current position
 * must live in the mapContainer to access the map instance via useMap()
 */

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
  const mapRef = useRef(null)

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
        ref={mapRef}
        crs={L.CRS.Simple}
        center={currPos}
        zoom={2}
        minZoom={3}
        style={{ height: "100%", width: "100%", background: "#F5F3F4" }}
      >
        {pathPoints.slice(1).map((point, i) => (
          <Polyline
            key={i}
            positions={[displacementPoints[i], displacementPoints[i + 1]]}
            pathOptions={{
              color: altitudeToColour(
                point.altitude_m,
                minAltitude,
                maxAltitude
              ),
              weight: 4,
            }}
          />
        ))}
        <Marker position={currPos} icon={createDroneIcon(headingDeg)} />
        <FollowDrone position={currPos} />
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
