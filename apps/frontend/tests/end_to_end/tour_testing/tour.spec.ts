import {test, expect, Page} from "@playwright/test"

const startTour = (page:Page) =>
    page.getByRole("button",  {name:"Take the full tour"}).click()
const next = (page:Page) => page.getByRole("button", {name: /^Next/}).click()

test.describe("Guided tour", () => {
    test.beforeEach(async({page }) =>  {
        await page.addInitScript(() => localStorage.clear())
    })

    test("starts on help page jumps to gestures and shows the first step", async({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)

        await expect(page).toHaveURL(/#\/app\/gestures/)
        await expect(page.getByText("Live Stats")).toBeVisible({timeout:6000})
    })

    test("Next advances through all 6 gestures steps then crosses to the ananlytics page", async ({page}) => {
        await page.goto("/#/app/help")
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
        await expect(page).toHaveURL(/#\/app\/analytics/)
        await expect(page.getByText("Session Summary")).toBeVisible({timeout:6000})
    })

    test("Back returns to the previous step without changing route", async({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)
        await expect(page.getByText("Live stats")).toBeVisible({timeout:6000})

        await next(page)
        await expect(page.getByText("Drone Mode")).toBeVisible({timeout:6000})

        await page.getByRole("button",{name:"Back"}).click()
        await expect(page.getByText("Live stats")).toBeVisible()
        await expect(page).toHaveURL(/#\/app\/gestures/)


    })


    test("Skip tour closes it and marks tour as fully seen (not per page keey)",async ({page}) => {
        await page.goto("/#/app/help")
        await startTour(page)
        await expect(page.getByText("Live Stats")).toBeVisible({timeout:6000})

        await page.getByText("Skip tour").click()
        await expect(page.getByText("Live Stats")).not.toBeVisible()

        const seenFull = await page.evaluate(() => localStorage.getItem("tour_seen_full"))
        const seenGestures = await page.evaluate(() => localStorage.getItem("tour_seen_gestures"))
        expect(seenFull).toBe("true")
        expect(seenGestures).toBeNull()
    })

    test("does not auto start a tour already marked as seen",async({page}) => {
        await page.addInitScript(() => localStorage.setItem("tour_seen_full", "true"))
        await page.goto("/#/app/gestures")
        await expect(page.getByText("Live Stats")).not.toBeVisible()
    })

})