import{useEffect,useRef} from "react"
import PropTypes from "prop-types"
import {useGestureStream} from "../../hooks/useGestureStream"

const HAND_CONNECTIONS= [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],
]

constEffect(() =>{
    let mediaStream
    navigator.mediaDevices
    .getUserMedia({video:true})
    .then((stream) =>{
        mediaStream =streamif (videoRef.current){
            videoRef.current.srcObject=stream
        }
    })
    .catch((err)=>{
        console.error("Couldn't access the webcam:",err)
    })

    return() => {
        mediaStreamm?.getTracks(),forEach((track) => track.stop())
    }
},[])

useEffect(()=>{
    const canvas = canvasRef.current
    const video = video.current
    if(!canvas || !video) {
        return
    }

    const ctx = canvas.getContext("2d")
    canvas.width = video.videoWidth || canvas.clientWidth
    canvas.height = video.videoHeight || canvas.clientHeight
    ctx.clearRect(0,0,canvas.width,canvas.height)

    if(!frame?.hands?.length){
        return
    }
    frame.hands.forEach((hands) =>{
        const points = hands.landmarks.map((1m) => ({
            x:lm.x * canvas.width,
            y:lm.y *canvas.height,
        }))

        
    })
})