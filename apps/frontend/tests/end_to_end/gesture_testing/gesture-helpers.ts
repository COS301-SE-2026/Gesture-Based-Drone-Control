import type { APIRequestContext } from "@playwright/test"

const BACKEND_PORT = process.env.BACKENDPORT ?? "3001"
export const API_BASE = `http://localhost:${BACKEND_PORT}`

export const CALIBRATION_ROUTE = process.env.E2E_CALIBRATION_ROUTE ?? "/gestures"
export const CAMERA_FEED_ROUTE = process.env.E2E_CAMERA_FEED_ROUTE ?? "/gestures"

export const hasScriptedCamera = process.env.GBDC_TESTS_SCRIPTED_CAMERA === '1'

export const PRETTY_SEQUENCE = [
    "Open Palm",
    "Fist",
    "One Finger",
    "Two Fingers",
    "Three Fingers",
    "Four Fingers",
]

export interface CalibrationStatus {
    status: "not_started" | "in_progress" | "completed" | "skipped"
    is_calibrated: boolean
    target_gesture: string | null
    progress: {
        index: number
        total: number
        completed: string[]
    } | null
    sequence: string[]
}

export interface PipelineStatus {
    running: boolean 
    connected_clients: number
}

export async function getCalibrationStatus(
    request: APIRequestContext
): Promise<CalibrationStatus> {
    const res = await request.get(`${API_BASE}/api/calibration/status`)
    return (await res.json()) as CalibrationStatus
}

export async function getPipelineStatus(request: APIRequestContext) : Promise<PipelineStatus> {
    const res = await request.get(`${API_BASE}/api/gestures/status`)
    return (await res.json()) as PipelineStatus
}

export async function waitForPipelineStopped(
    request: APIRequestContext,
    timeoutMs = 15_000
) : Promise<PipelineStatus> {
    const deadline = Date.now() + timeoutMs
    let status = await getPipelineStatus(request)
    while (Date.now() < deadline) {
        if (!status.running && status.connected_clients === 0) return status
        await new Promise((r) => setTimeout(r, 300))
        status = await getPipelineStatus(request)
    }
    return status
}