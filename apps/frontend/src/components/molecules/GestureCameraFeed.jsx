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
const GestureCameraFeed = ({className = "" })=>{
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const {frame,connected} = useGestureStream()

    useEffect(() =>
        {
        let mediaStream
        navigator.mediaDevices
            .getUserMedia({video:true})
            .then((stream) =>{
                mediaStream =stream
                if (videoRef.current)
                    {
                        videoRef.current.srcObject=stream
                    }
                })

                .catch((err)=>{
                    console.error("Couldn't access the webcam:",err)
                })

            return() => 
                {
                mediaStream?.getTracks().forEach((track) => track.stop())
                }
        },[])

        useEffect(()=>{
            const canvas = canvasRef.current
            const video = videoRef.current
            if(!canvas || !video) 
                {
                    return
                }
//faaah missing bracket 
            const ctx = canvas.getContext("2d")
            canvas.width = video.videoWidth || canvas.clientWidth
            canvas.height = video.videoHeight || canvas.clientHeight
            ctx.clearRect(0,0,canvas.width,canvas.height)

            if(!frame?.hands?.length)
                {
                    return
                }
            frame.hands.forEach((hand) =>
                {
                const points = hand.landmarks.map((lm) => ({
                    x:lm.x * canvas.width,
                    y:lm.y *canvas.height,
                }
            )
        )

    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 2
    HAND_CONNECTIONS.forEach(([a,b])=>{
        const p1 = points[a]
        const p2 = points[b]
        if(!p1 || !p2){
            return
        }

        ctx.beginPath()
        ctx.moveTo(p1.x,p1.y)
        ctx.lineTo(p2.x,p2.y)
        ctx.stroke()
    })    

    ctx.fillStyle = "#ffffff"
    points.forEach((p) => {
        ctx.beginPath()
            ctx.arc(p.x, p.y ,3,0,Math.PI *2)
            ctx.fill()
    })
})
},[frame])

return (
    <div className ={`relative w-full h-full bg-OffBlack/50 rounded border border-Grey/20 overflow-hidden min-h-[400px] ${className}`}
    >
        <video
        ref ={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        />
        <canvas ref = {canvasRef} className ="absolute inset-0 w-full h-full"/>
        <div className ="absolute top-4 right-4 flex items-center gap-2 bg-OffBlack/60 px-3 py-1 rounded-full text-xs text-OffWhite">
        <span
        className={`w-2 h-2 rounded-full ${connected? "bg-green-500 animate-pulse" : "bg-Grey"}`}
        />
        <span>{connected? "Active": "Disconnected"}</span>
        </div>
    </div>
    


    )
}


GestureCameraFeed.propTypes ={
    className: PropTypes.string,
}

export default GestureCameraFeed