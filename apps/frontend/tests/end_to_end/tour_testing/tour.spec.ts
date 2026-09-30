import {test, expect, Page} from "@playwright/test"

const tip = (page:Page) => page.getByTestId("tour-tooltip")
const startTour = (page:Page) =>
    page.getByRole("button",  {name:"Take the full tour"}).click()
const next = (page:Page) => tip(page).getByTestId("tour-next").click()
const back = (page:Page) => tip(page).getByTestId("tour-back").click()

test.describe("Guided tour", () => {
    test.beforeEach(async({page }) =>  {
        await page.addInitScript(() => localStorage.clear())
    })

    test("starts on help page jumps to gestures and shows the first step", async({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)

        await expect(page).toHaveURL(/#\/app\/gestures/)
        await expect(tip(page)).toContainText("Live Stats", {timeout:6000})    
    })

    test("Next advances through all 6 gestures steps then crosses to the ananlytics page", async ({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)
        await expect(tip(page)).toContainText("Live Stats", {timeout:6000}) 

        const gestureStepTitles =[
            "Drone Mode",
            "Gesture Detection",
            "Gesture Guide",
            "Sim Viewer",
            "Command History",
        ]

        for(const title of gestureStepTitles){
            await next(page)
            await expect(tip(page)).toContainText(title, {timeout:6000})  
        }

        await next(page)
        await expect(page).toHaveURL(/#\/app\/analytics/)
        await expect(tip(page)).toContainText("Session Summary", {timeout:6000})  
    })

    test("Back returns to the previous step without changing route", async({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)
        await expect(tip(page)).toContainText("Live Stats", {timeout:6000})  

        await next(page)
        await expect(tip(page)).toContainText("Drone Mode", {timeout:6000})  

        await back(page)
        await expect(tip(page)).toContainText("Live Stats", {timeout:6000})  
        await expect(page).toHaveURL(/#\/app\/gestures/)


    })


    test("Skip tour closes it and marks tour as fully seen (not per page keey)",async ({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)
        await expect(tip(page)).toContainText("Live Stats", {timeout:6000})  

        await tip(page).getByTestId("tour-skip").click()
        await expect(tip(page)).not.toBeVisible()

        const seenFull = await page.evaluate(() => localStorage.getItem("tour_seen_full"))
        const seenGestures = await page.evaluate(() => localStorage.getItem("tour_seen_gestures"))
        expect(seenFull).toBe("true")
        expect(seenGestures).toBeNull()
    })

    test("does not auto start a tour already marked as seen",async({page}) => {
        await page.addInitScript(() => localStorage.setItem("tour_seen_full", "true"))
        await page.goto("/#/app/gestures")
        await expect(tip(page)).not.toBeVisible()
    })

})