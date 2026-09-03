import { useState, memo } from "react"
import PropTypes from "prop-types"
import { Card, Label, StatusDot } from "../atoms"
import { Video } from "lucide-react"

const DroneFeedPanel = memo(function DroneFeedPanel({
  droneMode,
  connectionStatus,
  droneSimUrl,
  hardwareFeedUrl,
  className = "",
}) {
  const [loaded, setLoaded] = useState(false)
  const isConnected = connectionStatus === "connected"
  const isSim = droneMode === "DroneSim"

  return (
    <Card variant="glass" className={`animate-rise ${className}`}>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <Label size="md">{isSim ? "Sim Viewer" : "Live Feed"}</Label>
          <div className="flex items-center gap-2">
            <StatusDot
              variant={isConnected ? "connected" : "disconnected"}
              size="sm"
            />
            <span className="text-xs text-dim font-mono uppercase">
              {isConnected ? "live" : "offline"}
            </span>
          </div>
        </div>

        <div className="relative flex-1 min-h-[220px] rounded-lg overflow-hidden bg-black/40 border border-glass">
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dim">
              <Video className="w-10 h-10 opacity-40" />
              <span className="text-xs uppercase tracking-widest">
                waiting for connection
              </span>
            </div>
          )}

          {/* {isConnected && !loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-10 h-10 rounded-full border-2 border-glassBrd border-t-red animate-spin" />
            </div>
          )} */}

          {isConnected && isSim && (
            <iframe
              title="drone-sim-viewer"
              src={droneSimUrl}
              onLoad={() => setLoaded(true)}
              className={`w-full h-full transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              allow="autoplay"
            />
          )}

          {isConnected && !isSim && (
            <iframe
              src={hardwareFeedUrl}
              alt="drone live feed"
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-100"
              }`}
            />
          )}
        </div>
      </div>
    </Card>
  )
})

DroneFeedPanel.propTypes = {
  droneMode: PropTypes.string.isRequired,
  connectionStatus: PropTypes.string,
  droneSimUrl: PropTypes.string,
  hardwareFeedUrl: PropTypes.string,
  className: PropTypes.string,
}

//TODO:UPDATE TO ACTUAL PLACES
DroneFeedPanel.defaultProps = {
  connectionStatus: "disconnected",
  droneSimUrl: "http and port for dronesim",
  hardwareFeedUrl: "http://localhost:3001/api/drone/feed?w=1200&h=480",
}

export default DroneFeedPanel
