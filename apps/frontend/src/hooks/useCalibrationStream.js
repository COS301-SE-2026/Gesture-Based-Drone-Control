import { API_BASE_URL } from "../lib/api"
import { useFrameStream } from "./useFrameStream"

/* 
WS client for /api/calibration/stream plus REST helpers for skip/status

Connecting to the WebSocket starts a fresh calibration run on the backend
*any prev result is discarded, so mounting a component that use this hook
is starting calibration
To restart a run, remount the comopnent

Does not auto-reconnect on purpose because the backedn restarts the run
on every new connection, so a reconnect loop would reset the user's progress
forever
Server closes the socket itself once the run is done whoch must not be treated 
as a failure, finished letts the 2 apart
*/

export async function skipCalibration() {
  const response = await fetch(`${API_BASE_URL}/api/calibration/skip`, {
    method: "POST",
  })
  return response.json()
}

export async function fetchCalibrationStatus() {
  const response = await fetch(`${API_BASE_URL}/api/calibration/status`)
  return response.json()
}

export function useCalibrationStream() {
  const {frame, connected} = useFrameStream("/api/calibration/stream")
  const finished = frame?.phase === "done"

  return {frame, connected, finished}
}
