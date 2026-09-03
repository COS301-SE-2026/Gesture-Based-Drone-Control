import {test, expect,Page} from "@playwright/test"

const startTour = (page:Page) =>
    page.getByRole("button", {name:"Take the full tour"}).click()

test.describe("TourTooltip", () => {
    test.beforeEach(async ({page}) => {
        await page.addInitScript(() => localStorage.clear())
        await page.goto("/#/app/help")
        await page.waitForLoadState("domcontentloaded")
        await startTour(page)
        await expect(page.getByText("Live Stats")).toBeVisible({timeout:6000})
    })

    test("renders the step title, content and hides Back on the first step", async ({page}) => {
        await expect(
            page.getByText(/Battery, signal, speed, and alt/i)
        ).toBeVisible()
        await expect(page.getByRole("button",{name: "Back"})).not.toBeVisible()
        await expect(page.getByText("Next (1/12)")).toBeVisible()
    })

    test("next advances to the next step and updates the index", async ({page}) => {
        await page.getByRole("button", {name:/^Next/}).click()
        await expect(page.getByText("Drone Mode")).toBeVisible({timeout:6000})
        await expect(page.getByText("Next (2/12)")).toBeVisible()
    })

    test("Back appears after the first step and returns to the prior one", async ({page}) =>{
        await page.getByRole("button", {name:/^Next/}).click()
        await expect(page.getByText("Drone Mode")).toBeVisible({timeout:6000})
        await page.getByRole("button",{name: "Back"}).click()
        await expect(page.getByText("Live Stats")).toBeVisible()
        await expect(page.getByRole("button",{name: "Back"})).not.toBeVisible()

    })

    test("skip tour hides the tooltip and marks the full tour as seen", async ({page}) =>{
        await page.getByText("Skip tour").click()
        await expect(page.getByText("Live Stats")).not.toBeVisible()

        const seen = await page.evaluate(() => localStorage.getItem("tour_seen_full"))
        expect(seen).toBe("true")

    })


    
})