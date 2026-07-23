import{ useEffect,useRef, useState} from "react"
import PropTypes from "prop-types"


//overvieww
/**So basically this molecule should create a visual image of a gamepad for the controller tab on the Gestures page.
The live input from the physical controller will be read and connected tp the laptop and the things done on the physical controller will
reflect on this gamepad on the controller tab.

A standard controller appearance and controls is usedd.
 **/

const STICK_RANGE =22 //its like how far it can move when pressed
const DEADZONE =0.08 //da deadzone like an ignore zone basically

const cleanAxis = (axis = 0) => (Math.abs(axis) < DEADZONE ? 0 :axis)
const ControllerLayout = ({className = ""}) => {
    const[connected,setConnected] = useState(false)//detedted by the brosweser or nah?
    const[buttons,setButtons] = useState(Array(17).fill(false))
    const[axes,setAxes] = useState([0,0,0,0])//left x then y then right x then y
    const rafRef = useRef(0)

    useEffect(() => {
        /**basically runs every animation frame so it reads the first connected gamepad from the browser and copies its button/axis
         state into the react state and renders the svg with the last input .. */
        const poll = () => {
            const pads = navigator.getGamepads ? navigator.getGamepads() :[]
            const pad = Array.from(pads||[]).find((p) =>  p&&p.connected)

            if(pad)
            {
                setConnected(true)
                setButtons(pad.buttons.map((b) =>b.pressed || b.value > 0.5))//so pushed more than halfway and its pressed
                setAxes([
                    cleanAxis(pad.axes[0]||0),
                    cleanAxis(pad.axes[1]||0),
                    cleanAxis(pad.axes[2]||0),
                    cleanAxis(pad.axes[3]||0),
                ])
            }
            else
            {
                setConnected(false)
            }
            rafRef.current = requestAnimationFrame(poll)
        }
        rafRef.current = requestAnimationFrame(poll)

        const handleConnect = () => setConnected(true)
        const handleDisconnect = () => setConnected(false)
        window.addEventListener("gamepadconnected" ,handleConnect)
        window.addEventListener("gamepaddisconnected" ,handleDisconnect)

        //just the cleanup man
        return()=>{
             if(rafRef.current !== null){
                cancelAnimationFrame(rafRef.current)
             }

            window.removeEventListener("gamepadconnected",handleConnect)
            window.removeEventListener("gamepaddisconnected",handleDisconnect)
        }
    },[])

    const isPressed = (index) => buttons[index] //held down atm?? or nah?
    const btnFill = (index) =>
        isPressed(index) ? "fill-Red stroke-Red": "fill-Grey/20 dark:fill-DarkGrey/40 stroke-OffBlack/30 dark:stroke-OffWhite/30"

    const leftStickX = 260 + axes[0] * STICK_RANGE
    const leftStickY = 250 + axes[1] * STICK_RANGE
    const rightStickX = 590 + axes[2] * STICK_RANGE
    const rightStickY = 250 + axes[3] * STICK_RANGE

    return (
        <div className = {`flex flex-col items-center gap-3 ${className}`} >
         <div className = "w-full flex items-center justify-between px-1">
            <span className= "text-xs font-mono text-OffBlack/60 dark:text-OffWhite/60">
             {connected ? "Controller Connected" : "No Controller Detected"}
            </span>
            <span
             className={`w-2 h-2 rounded-full ${
                connected ? "bg-Red" : "bg-Grey/40"
             }`}
            />          
        </div>

        <svg viewBox = "0 0 850 400" className ="w-full max-w-[600px]">
         <circle cx="150" cy ="300" r="150" className="fill-Grey/10 dark:fill-DarkGrey/60" />
         <circle cx="700" cy ="300" r="150" className="fill-Grey/10 dark:fill-DarkGrey/60" />
         <rect x= "150" y="150" width="550" height="180" rx="50" className="fill-Grey/10 dark:fill-DarkGrey/60" />

         <rect x= "130" y="10" width="150" height="45" rx="10" className="fill-Grey/10 dark:fill-DarkGrey/60" />
         <rect x= "200" y="0" width="150" height="45" rx="10" className="fill-Grey/20 dark:fill-DarkGrey/60" />
         <rect x= "500" y="0" width="150" height="45" rx="10" className="fill-Grey/20 dark:fill-DarkGrey/60" />
         <rect x= "570" y="10" width="150" height="45" rx="10" className="fill-Grey/10 dark:fill-DarkGrey/60" />

         <circle cx ="160" cy="115" r="24" strokeWidth ="2" className={btnFill(12)}/>
         <circle cx ="120" cy="155" r="24" strokeWidth ="2" className={btnFill(14)}/>
         <circle cx ="200" cy="155" r="24" strokeWidth ="2" className={btnFill(15)}/>
         <circle cx ="160" cy="195" r="24" strokeWidth ="2" className={btnFill(13)}/>

         <circle cx ="425" cy="110" r="26" strokeWidth ="2" className={btnFill(16)}/>

         <rect x= "345" y="180" width="70" height="30" rx="15" strokeWidth="2" className={btnFill(8)} />
         <text x="380" y="222" textAnchor="middle" className="text-[9px] fill-OffBlack/60 dark:fill-OffWhite/60">SELECT</text>

         <rect x="435" y="180" width="70" height="30" rx="15" strokeWidth="2" className={btnFill(9)}/>
         <text x="470" y="222" textAnchor="middle" className="text-[9px] fill-OffBlack/60 dark:fill-OffWhite/60">START</text>


         <circle cx ="740" cy="140" r="24" strokeWidth ="2" className={btnFill(3)}/>
         <circle cx ="700" cy="180" r="24" strokeWidth ="2" className={btnFill(2)}/>
         <circle cx ="780" cy="180" r="24" strokeWidth ="2" className={btnFill(1)}/>
         <circle cx ="740" cy="220" r="24" strokeWidth ="2" className={btnFill(0)}/>

         <circle cx="260" cy="250" r="55" strokeWidth="2" className="fill-Grey/15 dark:fill-DarkGrey/70 stroke-OffBlack/20 dark:stroke-OffWhite/20"/>

         <path d ="M260,205 l-8,15 h16 z" className ="fill-OffBlack/30 dark:fill-OffWhite/30" />
         <path d ="M260,295 l-8,-15 h16 z" className ="fill-OffBlack/30 dark:fill-OffWhite/30" />
         <path d ="M215,250 l15,-8 v16 z" className ="fill-OffBlack/30 dark:fill-OffWhite/30" />
         <path d ="M260,205 l-15,-8 v16 z" className ="fill-OffBlack/30 dark:fill-OffWhite/30" />

         <circle cx={leftStickX} cy={leftStickY} r="30" strokeWidth="2" className={btnFill(10)}/>

         <text x="260" y="330" textAnchor="middle" className="text-[11px] fill-OffBlack/50 dark:fill-OffWhite/50">Axis 0</text>

         <circle cx="590" cy="250" r="55" strokeWidth="2" className="fill-Grey/15 dark:fill-DarkGrey/70 stroke-OffBlack/20 dark:stroke-OffWhite/20"/>

         <path d ="M590,205 l-8,15 h16 z" className ="fill-OffBlack/30 dark:fil-OffWhite/30" />
         <path d ="M590,295 l-8,15 h16 z" className ="fill-OffBlack/30 dark:fil-OffWhite/30" />
         <path d ="M545,250 l15,-8 v16 z" className ="fill-OffBlack/30 dark:fil-OffWhite/30" />
         <path d ="M635,250 l-15,-8 v16 z" className ="fill-OffBlack/30 dark:fil-OffWhite/30" />

         <circle cx={leftStickX} cy={leftStickY} r="30" strokeWidth="2" className={btnFill(11)}/>
         <text x="590" y="330" textAnchor="middle" className="text-[11px] fill-OffBlack/50 dark:fill-OffWhite/50">Axis 1</text>
        </svg>
    </div>
    )
}

ControllerLayout.propTypes={
    className:PropTypes.string,
}

ControllerLayout.defaultProps={
    className: "",
}

export default ControllerLayout 



    
    

