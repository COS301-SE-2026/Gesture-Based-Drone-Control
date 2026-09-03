export const gesturesSteps =[

    {
        route:"/app/gestures",
        target:'[data-tour="stats-card"]',
        title:"Live Stats",
        content: "Battery, signal, speed, and alternative update here in real time once you are connected.",
    },


    {
        route:"/app/gestures",
        target:'[data-tour="drone-mode-card"]',
        title:"Drone Mode",
        content:"Switch between DroneSim, Manual, and Autonomous - this decides which adapter you are connected to.",

    },


    {
        route:"/app/gestures",
        target:'[data-tour="gesture-camera"]',
        title:"Gesture Detection",
        content:"Your hand is tracked here. If you have not caliberated yet, this card will walk you through it first.",
    },


    {
        route:"/app/gestures",
        target:'[data-tour="gesture-guide"]',
        title:"Gesture Guide",
        content:"A reference for every gesture the system recognizes, plus manual command buttons.",
    },

    {
        route:"/app/gestures",
        target:'[data-tour="sim-viewer"]',
        title:"Sim Viewer",
        content:"A live feed simulation drone, it shows the connection status as well as the current mode.This does switch to the actual caera of the physical drone depending on the mode selected",

    },

    {
        route:"/app/gestures",
        target:'[data-tour="command-history"]',
        title:"Command History",
        content:"Every command executed this session , whether triggered by a gesture, keyboard input or an onscreen button will show up here "

    },

// ayt so if we decide to do the carea card switching thing then that has to be chnages accordingly here too
//dont forget to make the chnages on the organism pages as well to ass the tags pper name
]


export const gpsSteps =[

    {
        route: "/app/gps",
        target: '[data-tour="flight-path-map"]',
        title:"Flight Path",
        content:"Built live from telemetry as you fly - traces exactly where the drone has gone during the session.",

    },


    {
        route: "/app/gps",
        target: '[data-tour="displacement-stats"]',
        title:"Displacement Stats",
        content:" Altitude, X/Y displacement, speed, and heading - the numbers behind the map.",

    }


]


export const analyticsSteps=[
    {
        route: "/app/analytics",
        target: '[data-tour="analytics-summary"]',
        title:"Session Summary",
        content:"Total flights, your fastest speed and altitude reached this sesssion."

    },

    {
        route: "/app/analytics",
        target: '[data-tour="analytics-live-charts"]',
        title:"Live Charts",
        content:"Speed and battery health,updating in real time as telemetry comes in."
    },

    {
        route: "/app/analytics",
        target: '[data-tour="analytics-performance"]',
        title:"Flight History",
        content:"Duration of your most recent completed flights pulled from the database"
    },

    {
        route: "/app/analytics",
        target: '[data-tour="analytics-totals"]',
        title:"Overall Totals",
        content:"Distance flown, average flight duration and avergae speed across your sessions."
    },




]


//so i lowkey made it in a way that its a first time thing when we initially open it as a new user, if... for demo sakes wanna show either go to help page for full tour 
// or do localStorage.clear() on the console.



export const fullTourSteps =[...gesturesSteps, ...analyticsSteps, ...gpsSteps]