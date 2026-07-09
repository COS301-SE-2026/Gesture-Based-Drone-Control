# Overview of the Front-End Unit Testing
The tests have been done using Playwright which is an open source automation framework used for end-to-end testing.
All the tests assume that the tests are running on the base url which is 'http://localhost:3000'

# Testing approach
A bottom up apprach was used to do testing starting with testing the the atoms, followed by testing the molecules and then the organism as a whole following the way it was set up in the front-end developement
- **Atoms** - these are the smallest building blocks of the front-end(buttons, labels, cards)
- **Molecules** - these are a combination of atoms made into a component(cards with the labels and buttons and how they work together/we are testing if they work together)
- **Organisms** - full pages which are a combination of molecules(dashboard page,analytics page, gestures page)


IMPORTANT NOTE : the current front end testings are for the hard coded values in the web page at the moment and this will be chnage one the API gets connected


# Running the tests
 step 1: Start off by ensuring that you are in the frontend branch, the following command can be used for this: cd apps/frontend
 step 2: If you want to test everything at once, run: make test
 step 3: If you want to test a specific file run: npx playwright test tests/unitTesting/<filename>


# Testing files:
# 1. atoms.spec.ts
This file tests the smallest components such as the Card, Label, NavItem, Button, Toggle and the statusDot.It checks the rendering, clickability as well as the navigation to check if all the navbar options connect to the right pages

# 2. molecules.spec.ts
This file tests the merged components which are DroneModeCard,DroneInfoCard,GPSWidget,CommandHiistory,GestureGuide,GestureCalibration,SideBar,DarkModeToggle and DashboardSideCard.
The tests ensure that the rendering is done correctly, the interactions as well as the data display.

# 3. dashboard.spec.ts
- falls under Use Case 2
This tests the dashboard/home page of the website. It covers the overall display and visibility of the drone stats, camera feed placehoolder, drone info,mode selection and the GPS compass

# 4. analytics.spec.ts
- falls under Use Case 2
This tests the analytics page.It covers the metrc cards, chart headings and bottom stats


# 5. gestures.spec.ts
- falls under Use Case 1
This tests the gesture control page.It covers the gesture detection,command history,gesture guide,and calibration.

