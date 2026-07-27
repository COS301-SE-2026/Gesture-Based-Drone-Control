# Component Library Documentation - Atoms

## Button
Versatile button with loading states and icons

prop: 'variant'
type: "default" / "secondary"
default: "secondary"
description: Visual style

prop: 'isLoading'
type: boolean
default: false
description: Shows spinner

prop: 'icon'
type: ComponentType
default: null
description: Lucide icons were used

prop: 'size'
type: "sm" / "md" / "lg"
default: "md"
description: Button size

prop: 'disabled'
type: boolean
default: false
description: Disables the button

prop: 'onClick'
type: function
default: undefined
description: Handles any clicks on the button

prop: 'children'
type: node
default: undefined
description: Button content


## Card
Glass-morphism card component with hover effects

prop: 'children'
type: node
default: undefined
description: Card content

prop: 'className'
type: string
default: ""
description: Additional CSS classes

prop: 'variant'
type: "glass" / "dark"
default: "glass"
description: Visual style variant

prop: 'clickable'
type: boolean
default: false
description: Makes card interactive with hover effects

prop: 'onClick'
type: function
default: null
description: Click handler (required if clickable is true)


## Input
Form input with icon, password toggle, and error handling

prop: 'type'
type: "text" / "email" / "password" / "number" / "tel" / "url"
default: "text"
description: Input type

prop: 'placeHolder'
type: string
default: ""
description: Placeholder text

prop: 'icon'
type: ComponentType
default: null
description: Lucide icon to display on the left

prop: 'error'
type: boolean
default: false
description: Error state flag

prop: 'errorMessage'
type: string
default: ""
description: Error message to display below input

prop: 'className'
type: string
default: ""
description: Additional CSS classes

prop: 'value'
type: string / number
default: undefined
description: Input value

prop: 'onChange'
type: function
default: undefined
description: Change handler function

prop: 'disabled'
type: boolean
default: false
description: Disables the input


## Label
Small typography component for form labels

prop: 'children'
type: node
default: undefined
description: Label content

prop: 'size'
type: "xs" / "sm"
default: "xs"
description: Text size variant

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## MetricValue
Display numerical metrics with units

prop: 'value'
type: string / number
default: REQUIRED
description: The metric value to display

prop: 'unit'
type: string
default: undefined
description: Unit of measurement (e.g., "km/h", "%")

prop: 'size'
type: "sm" / "md" / "lg" / "xl"
default: "md"
description: Text size variant

prop: 'className'
type: string
default: ""
description: Additional CSS classes



## NavItem
Navigation item for sidebars and menus

prop: 'label'
type: string
default: REQUIRED
description: Navigation item text

prop: 'Icon'
type: ComponentType
default: undefined
description: Lucide icon component

prop: 'active'
type: boolean
default: false
description: Active state styling

prop: 'onClick'
type: function
default: undefined
description: Click handler function

prop: 'className'
type: string
default: ""
description: Additional CSS classes



## StatusDot
Visual status indicator with pulsing animation

prop: 'variant'
type: "connected" / "disconnected" / "warning" / "idle"
default: "connected"
description: Status type and color

prop: 'size'
type: "sm" / "md"
default: "sm"
description: Dot size

prop: 'className'
type: string
default: ""
description: Additional CSS classes


## Toggle
Switch component for boolean settings

prop: 'checked'
type: boolean
default: false
description: Initial checked state

prop: 'onChange'
type: function
default: null
description: Change handler receives new value

prop: 'disabled'
type: boolean
default: false
description: Disables the toggle

prop: 'className'
type: string
default: ""
description: Additional CSS classes


