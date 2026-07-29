import {Card ,Label } from "../atoms"
import { GestureTutorialCarousel, TutorialVideoCard, FAQItem} from "../molecules"

const gestureTutorials = [
    {
        id: "fist",
        name: "First - Hover",
        instructions: "Make a closed fist to hold the drone's current position ",
        gif:"/assets/gestures/fist.gif",
        expectedGesture:"waiting on shav",
    },
    //find the gestures and their corresponding controls from Ayush's files
    {
        id:"open-palm",
        name:"Open Palm-Land",
        instructions:"Show an open palm to trigger landing. ",
        gif: "/assets/gestures/open-palm.gif",
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
                <Label className="text-lg font-semibold">Tutorials Videos</Label>
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
    
