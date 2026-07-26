import {test,expect} from "@playwright/test"
import {
    API_BASE,
    CAMERA_FEED_ROUTE,
    getPipelineStatus,
    waitForPipelineStopped,
} from "./gesture-helpers"

test.describe.configure({mode: "serial"})

test.describe("gesture camera feed (any camera", () => {
    test.skip(
        ({browserName}) => browserName !== "chromium",
        "shared backedn camera, one browser enough"
    )

    test.beforeEach(async ({request}) => {
       await request.post(`${API_BASE}/api/calibration/skip`)
    })

    test.afterEach(async ({ page, request}) => {
        await page.goto("/analytics")
        await waitForPipelineStopped(request)
        await new Promise((r) => setTimeout(r, 2000))
    })

    test("connects, streams frames, and draws the overlay", async ({
        page,
        request,
    }) => {
        await page.goto(CAMERA_FEED_ROUTE)

        const activeBadge = page
            .locator("video")
            .first()
            .locator("..")
            .getByText("Active", {exact: true})
        await expect(activeBadge).toBeVisible ({
            timeout: 15_000,
        })
        
        await expect
            .poll(async () => (await getPipelineStatus(request)).connected_clients, {
                timeout: 15_000,
        })
        .toBeGreaterThanOrEqual(1)
    const status = await getPipelineStatus(request)
    expect(status.connected_clients).toBeGreaterThanOrEqual(1)

    const hasStream = await page
        .locator("video")
        .first()
        .evaluate((el: HTMLVideoElement) => {
            const s = el.srcObject as MediaStream | null
            return !!s && s.getVideoTracks().length > 0
        })
    expect(hasStream).toBe(true)

    const canvas = page.locator("canvas").first()
    await expect
        .poll(
            async () =>
                canvas.evaluate((el: HTMLCanvasElement) => {
                    const ctx = el.getContext("2d")
                    if (!ctx || el.width === 0 || el.height === 0) return false
                    const data = ctx.getImageData(0, 0, el.width, el.height).data
                    for (let i=3; i<data.length; i += 4) {
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
        await page.goto(CAMERA_FEED_ROUTE)

        const activeBadge = page
            .locator("video")
            .first()
            .locator("..")
            .getByText("Active", {exact: true})
        await expect(activeBadge).toBeVisible({
            timeout: 20_000,
        })
        await expect
            .poll(async () => (await getPipelineStatus(request)).running, {
                timeout: 15_000,
            })
            .toBe(true)

        await page.goto("/analytics")

        const after = await waitForPipelineStopped(request)
        expect(after.running).toBe(false)
        expect(after.connected_clients).toBe(0)
    })
})