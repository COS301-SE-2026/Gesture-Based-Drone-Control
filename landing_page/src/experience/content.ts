export type Chapter = {
  tag: string
  name: string
  pitch: string
  lead: string
  bullets: string[]
  stat: [string, string]
  link: string
}

export const DOCS = "https://cos301-se-2026.github.io/Gesture-Based-Drone-Control/docs/"
export const REPO = "https://github.com/COS301-SE-2026/Gesture-Based-Drone-Control"
export const RELEASES = `${REPO}/releases`
export const YOUTUBE = "https://www.youtube.com/@CodexMerchants"
export const EMAIL = "mailto:codexmerchants@gmail.com"

/** The six chapters that sit beside the arm */
export const VENTURES: Chapter[] = [
  { tag:'Motion-based control', name:'Your hand is the controller', pitch:'Nothing to hold, nothing to charge. The webcam watches your hand and the drone follows.',
    lead:'MediaPipe finds 21 keypoints in every frame of a plain webcam feed. A rule-based recognizer reads the angles between them, a stabilizer smooths them, and each gesture maps straight to a flight command: open palm hovers, index up climbs, a V sign orbits, a fist lands.',
    bullets:['Four core gestures, plus thumbs-up and finger counts for games and menus','A majority vote over a rolling buffer, so one jittery frame never moves the drone','Runs on a laptop CPU at 30 frames a second. No gloves, no markers, no depth sensor'],
    stat:['21','hand landmarks per frame'], link:`${DOCS}MANUAL/` },
  { tag:'Safety first', name:'Nothing flies uncalibrated', pitch:'A mandatory gate sits between your hand and the props.',
    lead:'Before the first command, Mudra walks you through every gesture once and proves it can read your hand under this light. Lose tracking mid-flight and the drone simply holds position.',
    bullets:['Calibration sequence: open palm, fist, then one to four fingers','80% of frames over a 3-second window must match to pass','Hover on tracking loss, with an emergency override always within reach'],
    stat:['3 s','rolling window per gesture'], link:`${DOCS}MANUAL/` },
  { tag:'Mini games', name:'Play before you fly', pitch:'Three arcade games flown with the same gestures as the drone.',
    lead:'Flappy Drone, Pac Drone and Night Watch live inside the dashboard, and every move in them is a real flight command. A high score is also practice, so by the time you fly for real the gestures are muscle memory.',
    bullets:['Flappy Drone: a thumbs-up starts it, altitude pulses carry you through the gaps','Pac Drone: fly the maze, dodge the ghosts, then get your revenge','Night Watch: catch as many intruders as you can before time runs out','Gesture, gamepad or keyboard, with a leaderboard for every game'],
    stat:['3','games, one command set'], link:DOCS },
  { tag:'Drone licensing', name:'Earn your wings', pitch:'Train for a Remote Pilot Licence without leaving the app.',
    lead:'Theory runs through an accredited ATO toward the SACAA exam: air law, meteorology and navigation. Practical skills-test prep happens in the simulator, with progressive modules flown on real gesture control and a timed mock test at the end.',
    bullets:['Basic manoeuvres: up, down, left and right until the controls feel natural','Obstacle blocks, then a figure-8 traced around two markers','A timed mock skills test that mirrors the ATO assessment','Your checklist: Class 3 medical, radiotelephony certificate, English proficiency'],
    stat:['4','practical modules'], link:DOCS },
  { tag:'Simulator first', name:'Crash for free', pitch:'Rehearse the whole gesture set against a virtual drone.',
    lead:'A drone simulator ships alongside the app, so every feature can be flown in Project AirSim before you touch real hardware. Keyboard, gamepad and on-screen controls drive the same commands, which is also the accessibility story.',
    bullets:['Project AirSim on Unreal Engine 5, plus a legacy AirSim adapter','One command set for gestures, keyboard, gamepad and on-screen buttons','Adapters swap live; a dummy drone keeps the tests honest'],
    stat:['4','interchangeable ways to fly'], link:`${DOCS}SAS/` },
  { tag:'In the field', name:'Fly it, log it', pitch:'Hands-free flying, with the data to prove it.',
    lead:'Orbit a point of interest with two fingers, watch altitude, speed and link health beside the camera feed, follow the drone on a GPS map, then replay the whole flight afterwards.',
    bullets:['Live telemetry over WebSocket, with a Leaflet map of the path','Every flight logged to SQLite or Postgres: route, gestures sent, time in the air','A packaged desktop app for Windows (.exe) and Linux (.AppImage)'],
    stat:['< 1','frame from camera to command'], link:DOCS },
]

/** Scroll progress */
export const CHAP_P = [0.23, 0.324, 0.418, 0.512, 0.606, 0.7]
export const USES_P = 0.835
export const LINKS_P = 0.97

/** Loading-screen status */
export const STATUS = ["Opening webcam", "Finding 21 landmarks", "Calibrating OPEN_PALM", "Gate open. Link stable"]

export const HERO = {
  eyebrow: "Gesture flight interface · v0.9",
  lead: "Mudra reads your hand through any webcam, 21 landmarks, 30 times a second, and turns gestures into flight commands. No controller required. No gloves. Nothing between you and the drone.",
  stats: [["21", "hand landmarks"], ["60", "frames per second"], ["4", "core gestures"], ["100%", "on-device"]] as [string, string][],
}

export const PIPELINE = ["Camera", "21 landmarks", "Gesture", "Command", "Drone"]

export const ABOUT = "A real-time computer-vision system that removes the physical drone controller. Hand gestures are read from a live camera feed, classified by a landmark-driven recognition engine and turned into flight commands, with a calibration gate and fail-safes built in. Eight use cases, all implemented."

export const USE_CASES: { id: string; title: string; body: string }[] = [
  { id: "UC1", title: "Hand tracking & gesture recognition", body: "Live camera feed, MediaPipe landmark detection, rule-based classification and stabilizer smoothing, mapped gesture to command." },
  { id: "UC8", title: "Gesture calibration", body: "A guided calibration flow backed by a deterministic state machine. No flight command passes until the gate is clear." },
  { id: "UC2", title: "Dashboard & telemetry", body: "Altitude, speed, battery and link status beside the camera feed, with a command history streamed over WebSocket." },
  { id: "UC3", title: "Simulator adapter", body: "Project AirSim, legacy AirSim or a dummy drone, swapped live without restarting the app." },
  { id: "UC4", title: "Controller support", body: "Gamepad dual-stick mapping, keyboard fallback and on-screen buttons that drive the same command set as gestures." },
  { id: "UC5", title: "Flight logging", body: "A telemetry observer records every flight to SQLite or Postgres, with a summary you can replay afterwards." },
  { id: "UC6", title: "GPS simulation", body: "A simulated position feed drawn on a map view, with displacement statistics for each flight." },
  { id: "UC7", title: "Tutorial & help", body: "A gesture guide, an onboarding tour and an in-app help page, plus games and licence training to practise with." },
]

/** Footer links */
export const FOOTER_LINKS: { label: string; href: string; shape: "git" | "doc" | "download" | "play" | "mail"; desc: string }[] = [
  { label: "GitHub", href: REPO, shape: "git", desc: "Source, issues and the project board." },
  { label: "Docs", href: DOCS, shape: "doc", desc: "SRS, architecture, user manual, API reference." },
  { label: "Releases", href: RELEASES, shape: "download", desc: "Windows .exe and Linux .AppImage builds." },
  { label: "Demo videos", href: YOUTUBE, shape: "play", desc: "Recorded walkthroughs on the Codex Merchants channel." },
  { label: "Email us", href: EMAIL, shape: "mail", desc: "codexmerchants@gmail.com" },
]
