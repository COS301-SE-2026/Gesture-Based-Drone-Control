export const gesturesSteps =[

    {
        route:"/gestures",
        target:'[data-tour="stats-card"]',
        title:"Live Stats",
        content: "Battery, signal, speed, and alternative update here in real time once you are connected.",
    },


    {
        route:"/gestures",
        target:'[data-tour="drone-mode-card"]',
        title:"Drone Mode",
        content:"Switch between DroneSim, Manual, and Autonomous - this decides which adapter you are connected to.",

    },


    {
        route:"/gestures",
        target:'[data-tour="gesture-camera"]',
        title:"Gesture Detection",
        content:"Your hand is tracked here. If you have not caliberated yet, this card will walk you through it first.",
    },


    {
        route:"/gestures",
        target:'[data-tour="gesture-guide"]',
        title:"Gesture Guide",
        content:"A reference for every gesture the system recognizes, plus manual command buttons.",
    },

//ADD THE EXTRA STUFF AFTER UI REFACTORING
]


export const gpsSteps =[

    {
        route: "/gps",
        target: '[data-tour="flight-path-map"]',
        title:"Flight Path",
        content:"Built live from telemetry as you fly - traces exactly where the drone has gone during the session.",

    },


    {
        route: "/gps",
        target: '[data-tour="displacement-stats"]',
        title:"Displacement Stats",
        content:" Altitude, X/Y displacement, speed, and heading - the numbers behind the map.",

    }


]


//ALL THE OTHER PAGES NEED TO BE ADDED BUT LETS TEST THESE OUT FOR NOW.


export const fullTourSteps =[...gesturesSteps, ...gpsSteps]