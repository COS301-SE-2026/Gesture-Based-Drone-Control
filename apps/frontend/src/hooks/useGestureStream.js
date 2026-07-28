import { useFrameStream } from "./useFrameStream"

export function useGestureStream() {
  return useFrameStream("/api/gestures/stream")
}
