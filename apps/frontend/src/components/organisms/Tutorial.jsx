import {Card ,Label } from "../atoms"
import { GestureTutorialCarousel, TutorialVideoCard, FAQItem} from "../molecules"
import {POSES} from "../../lib/hand"


const gestureTutorials = [
    //get commands from shav
    {
        id:"open-palm",
        name: "Open-Palm -Hover",
        instructions:"Show an open palm to hold the drone's current position.",
        pose:POSES[0],
        droneGif: "/assets/drone-gifs/hover.gif",
        expectedGesture:"waiting on shav",
    },

    {
        id:"index-up",
        name: "Index Up",
        instructions:"Point your index fingers up",
        pose:POSES[1],
        droneGif: "/assets/drone-gifs/index-up.gif",
        expectedGesture:"waiting on shav",
    },

    {
        id:"v-sign",
        name:"V-Sign Orbit",
        instructions:"Make a V sign to do something with da drone",
        pose:POSES[2],
        droneGif: "/assets/drone-gifs/orbit.gif",
        expectedGesture:"waiting on shav",
    },
    {
        id:"fist",
        name:"Fist- Land",
        instructions: "Make a closed fist ti trugger landing",
        pose:POSES[3],
        droneGif: "/assets/drone-gifs/land.gif",
        expectedGesture:"waiting on shav",

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

const faqItems =[
    {
        question:"What if my gesture is not detected?",
        answer:"Make sure your hand is fully visible in the frame and well lit, then retry"
    },

    {
        question: "Can I use the drone without gestures?",
        answer:"Yes - switch to the keyboard adapter from the mode settings.",
    }
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

            <Card variant="glass" className ="space-y-4">
                <Label className ="text-lg font-semibold">FAQ</Label>
                {faqItems.map((f,i) => (
                    <FAQItem key={i} {...f}/>
                ))}
            </Card>
        </div>
    )
}


export default Tutorial
    
