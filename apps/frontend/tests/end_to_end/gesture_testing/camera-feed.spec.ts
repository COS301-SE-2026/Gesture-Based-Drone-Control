import {test,expect} from "@playwright/test"
import {
    API_BASE,
    CAMERA_FEED_ROUTE,
    backendHasCamera,
    getPipelineStatus,
    waitForPipelineStopped,
} from "./gesture-helpers"

test.describe.configure({mode: "serial"})

test.describe("gesture camera feed (any camera", () => {
    test.skip(
        ({browserName}) => browserName !== "chromium",
        "shared backedn camera, one browser enough"
    )

    test.beforeEach(async ({page, request}) => {
       await request.post(`${API_BASE}/api/calibration/skip`)
       await page.addInitScript(() => {
        localStorage.setItem("camera-consent", "granted")
       })
    })

    test.afterEach(async ({ page, request}) => {
        await page.getByRole("button", {name: "Analytics"}).click()
        await waitForPipelineStopped(request)
    })

    test("connects, streams frames, and draws the overlay", async ({
        page,
        request,
    }) => {
        test.skip(
            (!backendHasCamera()),
            "backend has no camera, no frames to draw"
        )
        
        await page.goto(CAMERA_FEED_ROUTE)

        const feed = page.getByTestId("gesture-camera-feed")
        const activeBadge = feed.getByText("Active", {exact: true})
        await expect(activeBadge).toBeVisible({
            timeout: 15_000,
        })
        
        await expect
            .poll(async () => (await getPipelineStatus(request)).connected_clients, {
                timeout: 15_000,
        })
        .toBeGreaterThanOrEqual(1)

    const canvas = page.locator("canvas").first()
    await expect
        .poll(
            async () =>
                canvas.evaluate(
                    (el: HTMLCanvasElement) => el.width > 0 && el.height > 0
                ),
                {timeout: 30_000}
            )
        .toBe(true)

    await expect
        .poll(
            async () =>
                canvas.evaluate((el: HTMLCanvasElement) => {
                    const ctx = el.getContext("2d")
                    if (!ctx || el.width === 0 || el.height === 0) return false
                    const data = ctx.getImageData(0, 0, el.width, el.height).data
                    for (let i = 3; i < data.length; i += 4) {
                        if (data[i] !== 0) return true
                    }
                    return false
                }),
            {timeout: 30_000}
        )
        .toBe(true)
    })

    test("disconnect releases the shared pipeline", async ({
        page,
        request,
    }) => {
        test.skip(
            (!backendHasCamera()),
            "backend has no camera, pipeline never starts"
        )
        
        await page.goto(CAMERA_FEED_ROUTE)

        const feed = page.getByTestId("gesture-camera-feed")
        const activeBadge = feed.getByText("Active", {exact: true})
        await expect(activeBadge).toBeVisible({
            timeout: 20_000,
        })

        await page.getByRole("button", {name: "Analytics"}).click()
        await expect(feed).toBeHidden({timeout: 10_000})

        const after = await waitForPipelineStopped(request)
        expect(after.running).toBe(false)
        expect(after.connected_clients).toBe(0)
    })
})