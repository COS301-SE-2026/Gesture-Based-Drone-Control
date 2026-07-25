// apps/frontend/src/hooks/useGamepadControl.js

import { API_BASE_URL, getWsUrl } from "@/lib/api";
import { useWebSocket } from "./useWebSocket";
import { useEffect, useRef } from "react";


// adjust along with adapter as needed. done here to lower number of useless packets
const DEADZONE  = 0.08

// apply deadzone to an analog axis
function cleanAxis(value) {
    if (Math.abs(value) < DEADZONE) return 0
    return Number(value.toFixed(3))
}

// read the full gamepad state and package it into the  GamepadAdapter schema
function readGamepad(pad) {
    return {
            left_x: cleanAxis(pad.axes[0]), //right==1, ,left==-1
            left_y: cleanAxis(pad.axes[1]), //down==1, up==-1

            right_x: cleanAxis(pad.axes[2]),
            right_y: cleanAxis(pad.axes[3]),
            //fully depressed == 1
            ltrigger: Number(((pad.buttons[6]?.value)||0).toFixed(3)),
            rtrigger:Number(((pad.buttons[7]?.value)||0).toFixed(3)),

            a: pad.buttons[0]?.pressed || false, //x
            b: pad.buttons[1]?.pressed || false, //o
            x: pad.buttons[2]?.pressed || false, //square
            y: pad.buttons[3]?.pressed || false, //triangle

            lb: pad.buttons[4]?.pressed || false,
            rb: pad.buttons[5]?.pressed || false,

            back: pad.buttons[8]?.pressed || false,
            start: pad.buttons[9]?.pressed || false,

            lclick: pad.buttons[10]?.pressed || false, //left stick click
            rclick: pad.buttons[11]?.pressed || false, //right stick click
            //dpad
            up: pad.buttons[12]?.pressed || false, 
            down: pad.buttons[13]?.pressed || false,
            left: pad.buttons[14]?.pressed || false,
            right: pad.buttons[15]?.pressed || false
    }; 
}

/**
 * Mirrors useKeyboardControl basically 1:1
 * 
 * post to /api/input/connect
 * opens ws to /api/input/ws/gamepad
 * polls via requestAnimationFrame and sends snapshots
 * clean disconnect
 */
export function useGamepadControl(enabled, wsUrl=getWsUrl("/api/input/ws/gamepad")){
    const  {socketRef, status } = useWebSocket(wsUrl)

    // index of active gamepad
    const gamepadIndexRef  = useRef(null)
    
    //rAF to cancel on cleanup
    const rafRef = useRef(null)

    useEffect(() => {
        if (!enabled) return

        fetch(`${API_BASE_URL}/api/input/connect`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({adapter: "gamepad"}),
        }).catch((err) =>
            console.error("useGamepadControl: failed to connect adapter", err)
        )

        return () => {
            fetch(`${API_BASE_URL}/api/input/disconnect`, {
                method: "POST",
            }).catch((err) =>
                console.error("useGamepadControl: failed to disconnect adapter", err)
            )
        }
    }, [enabled])

    // track the physical controllers connection status 
    useEffect(() =>{
        const onConnected = (e) => {
            console.log("useGamepadControl: controller connected , ", e.gamepad.id)
            gamepadIndexRef.current = e.gamepad.index
        }

        const onDisconnected  = (e) => {
            console.log("useGamepadControl: controller disconnected , ", e.gamepad.id)
            gamepadIndexRef.current = null  
        }

        window.addEventListener("gamepadconnected", onConnected)
        window.addEventListener("gamepaddisconnected", onDisconnected)

        return() => {
            window.removeEventListener("gamepadconnected", onConnected)
            window.addEventListener("gamepaddisconnected", onDisconnected)
        }
    },  [])

}