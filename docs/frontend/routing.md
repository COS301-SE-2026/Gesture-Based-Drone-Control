## Routing Configuration

Application routing setup using React Router DOM v6

### Route Structure

#### Public Routes (No Layout)
Routes that render without the RootLayout wrapper

**Login Page**
path: "/login"
element: Login
description: User authentication page

**Signup Page**
path: "/signup"
element: Signup
description: New user registration page

**Terms Page**
path: "/terms"
element: Terms
description: Terms and conditions page

---

#### Protected Routes (With RootLayout)
Routes nested under RootLayout, sharing common layout components

**Base Route**
path: "/"
element: RootLayout
description: Wrapper layout for all protected routes

**Dashboard**
path: "/" (index) and "/dashboard"
element: Dashboard
description: Main dashboard view with drone metrics

**Gestures**
path: "/gestures"
element: Gestures
description: Gesture control interface

**Analytics**
path: "/analytics"
element: Analytics
description: Flight telemetry and analytics dashboard

**Settings**
path: "/settings"
element: Settings
description: Application and drone settings

**GPS**
path: "/gps"
element: GPS
description: GPS tracking and location data

---

### Layout Hierarchy
