# Component Library Documentation - Molecules

## AnalyticsSideContent
Side content component for analytics page showing telemetry info

prop: 'No props'
type: N/A
default: N/A
description: Component has no external props, uses internal state only


## CommandHistory
Displays list of recent drone commands with timestamps

prop: 'commands'
type: array of objects (id, action, timestamp)
default: []
description: Array of command objects to display (shows mock data if empty)

prop: 'className'
type: string
default: ""
description: Additional CSS classes



## DarkModeToggle
Toggle switch for light/dark theme mode

prop: 'No props'
type: N/A
default: N/A
description: Uses useTheme hook internally, no external props needed


## DashboardSideCard
Welcome card for dashboard with user greeting and date

prop: 'userName'
type: string
default: "User"
description: Name of the logged-in user to display welcome message


## DroneInfoCard
Displays detailed information about the connected drone

prop: 'connected'
type: boolean
default: true
description: Connection status of the drone

prop: 'droneName'
type: string
default: "DroneName"
description: Name of the drone

prop: 'model'
type: string
default: "DroneModel"
description: Model number/name of the drone

prop: 'description'
type: string
default: "Professional drone with 4k camera"
description: Description of drone capabilities

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## DroneModeCard
Card for switching between DroneSim and Hardware modes

prop: 'currentMode'
type: "DroneSim" / "Hardware"
default: "DroneSim"
description: Currently active drone mode

prop: 'onModeChange'
type: function
default: null
description: Callback function when mode is changed, receives mode id

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## Compass
Visual compass display showing drone orientation

prop: 'heading'
type: number
default: 0
description: Current heading in degrees (0-360)

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## GestureCalibration
Shows gesture detection metrics and environmental factors

prop: 'visibility'
type: number
default: 80
description: Hand visibility percentage (0-100)

prop: 'confidence'
type: number
default: 45
description: Detection confidence percentage (0-100)

prop: 'stability'
type: number
default: 60
description: Gesture stability percentage (0-100)

prop: 'lighting'
type: string
default: "Good"
description: Lighting condition assessment

prop: 'background'
type: string
default: "Fair"
description: Background condition assessment

prop: 'className'
type: string
default: ""
description: Additional CSS classes

## GestureGuide
Displays keyboard shortcut guide for drone controls

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## GestureSideContent
Side content component for gesture controls page

prop: 'No props'
type: N/A
default: N/A
description: Component has no external props, uses internal state only


## SideBar
Main navigation sidebar with theme toggle and nav items

prop: 'items'
type: array of objects (id, label, path, icon)
default: []
description: Navigation items to display in sidebar

prop: 'topContent'
type: node
default: null
description: Optional content to display above navigation items

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## StatCard
Card component for displaying metrics with icons

prop: 'icon'
type: ComponentType
default: undefined
description: Lucide icon component to display

prop: 'label'
type: string
default: REQUIRED
description: Label text for the metric

prop: 'value'
type: string / number
default: REQUIRED
description: Metric value to display

prop: 'unit'
type: string
default: undefined
description: Unit of measurement (e.g., "km/h", "%")

prop: 'color'
type: string
default: "text-OffBlack"
description: Text color class for the icon

prop: 'className'
type: string
default: ""
description: Additional CSS classes