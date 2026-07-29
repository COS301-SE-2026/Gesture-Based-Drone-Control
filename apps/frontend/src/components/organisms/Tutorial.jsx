import {Card ,Label } from "../atoms"
import { GestureTutorialCarousel, TutorialVideoCard} from "../molecules"
import {POSES} from "../../lib/hand"


const gestureTutorials = [
    //get commands from shav
    {
        id:"open-palm",
        name: "Open-Palm - Hover",
        instructions:"Show an open palm to hold the drone's current position.",
        pose:POSES[0],
        droneVideo: "/assets/hover.mp4",
        expectedGesture:"OPEN_PALM",
    },

    {
        id:"index-up",
        name: "Index Up - Move Up",
        instructions:"Hold up one finger to move the drone",
        pose:POSES[1],
        droneVideo: "/assets/move-up.mp4",
        expectedGesture:"ONE_FINGER",
    },

    {
        id:"v-sign",
        name:"Two Fingers - Move Down",
        instructions:"Hold two fingers up to move down the drone",
        pose:POSES[2],
        droneVideo: "/assets/move-down.mp4",
        expectedGesture:"TWO_FINGERS",
    },
    
 
]

const tutorialVideos= [
    
    {
        id:"gesture",
        title: "Flying with theh Gesture Adapter",
        src: "/assets/videos/gesture-demo.mp4",
        description:"Same flight, controlled entirely by hand gestures.",
    },
]




const Tutorial = () => {
    return(
        <div className="p-6 space-y-6">
            <div className="space-y-4">
                <Label className="text-lg font-semibold">Gesture Controls</Label>
                <GestureTutorialCarousel gestures={gestureTutorials}/>
            </div>

            <div className="space-y-4">
                <Label className="text-lg font-semibold">Tutorial Videos</Label>
                <div className ="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tutorialVideos.map((v) => (
                        <TutorialVideoCard key ={v.id} {...v}/>
                    ))}
                </div>
            </div>

        </div>
    )
}


export default Tutorial
    
