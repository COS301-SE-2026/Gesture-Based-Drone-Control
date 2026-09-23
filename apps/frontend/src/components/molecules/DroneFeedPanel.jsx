import { useState, useMemo, useEffect, memo } from "react"
import PropTypes from "prop-types"
import { Card, Label, StatusDot } from "../atoms"
import { Video } from "lucide-react"
import { API_BASE_URL } from "../../lib/api"
import { useElementSize } from "../../hooks/useElementSize"

const FEED_PATH = "/api/drone/feed"

const FEED_MIN = 160
const FEED_MAX = 1280

const FEED_STEP = 32
const RESIZE_SETTLE_MS = 250

const snap = (n) =>
  Math.min(FEED_MAX, Math.max(FEED_MIN, Math.round(n / FEED_STEP) * FEED_STEP))

function useSettled(value, delay) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return settled
}

const DroneFeedPanel = memo(function DroneFeedPanel({
  droneMode,
  connectionStatus = "disconnected",
  droneSimUrl = `${API_BASE_URL}${FEED_PATH}`,
  hardwareFeedUrl = null,
  className = "",
}) {
  const [loaded, setLoaded] = useState(false)
  const [boxRef, box] = useElementSize()

  const isConnected = connectionStatus === "connected"
  const isSim = droneMode === "DroneSim"

  const w = useSettled(box.width ? snap(box.width) : 0, RESIZE_SETTLE_MS)
  const h = useSettled(box.height ? snap(box.height) : 0, RESIZE_SETTLE_MS)

  const hardwareUrl = useMemo(() => {
    if (hardwareFeedUrl) return hardwareFeedUrl
    if (!w || !h) return null
    return `${API_BASE_URL}${FEED_PATH}?w=${w}&h=${h}`
  }, [hardwareFeedUrl, w, h])

  useEffect(() => {
    setLoaded(false)
  }, [isConnected, isSim, hardwareUrl])

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

        <div
          ref={boxRef}
          className="relative flex-1 min-h-[220px] rounded-lg overflow-hidden bg-black/40 border border-glass"
        >
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dim">
              <Video className="w-10 h-10 opacity-40" />
              <span className="text-xs uppercase tracking-widest">
                waiting for connection
              </span>
            </div>
          )}

          {isConnected && !loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-10 h-10 rounded-full border-2 border-glassBrd border-t-red animate-spin" />
            </div>
          )}

          {isConnected && isSim && (
            <iframe
              title="drone-sim-viewer"
              src={droneSimUrl}
              onLoad={() => setLoaded(true)}
              className={`w-full h-full transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              allow="autoplay; fullscreen"
            />
          )}

          {isConnected && !isSim && hardwareUrl && (
            <img
              src={hardwareUrl}
              alt="drone live feed"
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                loaded ? "opacity-100" : "opacity-0" //NOSONAR
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

export default DroneFeedPanel
