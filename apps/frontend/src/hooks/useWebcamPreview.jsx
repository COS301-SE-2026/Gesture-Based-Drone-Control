import { useEffect } from "react"

export function useWebPreview(videoRef) {
    useEffect(() => {
        let mediaStream
        navigator.mediaDevices
            .getUserMedia({
                video: {width: {ideal: 640}, height: {ideal: 480}},
            })
            .then((stream) => {
                mediaStream = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            })
            .catch((err) => {
                console.error("Couldnt access the webcam", err)
            })

            return () => {
                mediaStream?.getTracks().forEach((track) => track.stop())
            }
    }, [videoRef])
}