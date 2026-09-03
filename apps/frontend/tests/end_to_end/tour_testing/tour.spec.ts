import {test, expect} from "@playwright/test"

const startTour = (page) =>
    page.getByRole("button",  {name:"Take the full tour"}).click()
const next = (page) => page.getByRole("button", {name: /^Next/}).click()

test.describe("Guided tour", () => {
    test.beforeEach(async({page }) =>  {
        await page.addInitScript(() => localStorage.clear())
    })

    test("starts on help page jumps to gestures and shows the first step", async({page}) => {
        await page.goto("/help")
        await startTour(page)

        await expect(page).toHaveURL(/\/gestures/)
        await expect(page.getByText("Live Stats")).toBeVisible({timeout:6000})
    })

    test("Next advances through all 6 gestures steps then crosses to the ananlytics page", async ({page}) => {
        await page.goto("/help")
        await startTour(page)
        await expect(page.getByText("Live stats")).toBeVisible({timeout:6000})

        const gestureStepTitles =[
            "Drone Mode",
            "Gesture Detection",
            "Gesture Guide",
            "Sim Viewer",
            "Command History",
        ]

        for(const title of gestureStepTitles){
            await next(page)
            await expect(page.getByText(title)).toBeVisible({ timeout:6000})
        }

        await next(page)
        await expect(page).toHaveURL(/\/analytics/)
        await expect(page.getByText("Session Summary")).toBeVisible({timeout:6000})
    })

    
})