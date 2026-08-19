import {test, expect} from "@playwright/test"
import {
    API_BASE,
    CALIBRATION_ROUTE,
    PRETTY_SEQUENCE,
    backendHasCamera,
    getCalibrationStatus,
    hasScriptedCamera,
    waitForPipelineStopped,
} from "./gesture-helpers"

test.describe.configure({mode:"serial"})

test.describe("gesture calibration (any camera", () => {
    test.skip(
        ({browserName}) => browserName !== "chromium",
        "shared backend camera, one browser is enough"
    )

    test.beforeEach(async ({page, request}) => {
        await request.post(`${API_BASE}/api/calibration/start`)
        await page.addInitScript(() => {
            localStorage.setItem("camera-consent", "granted")
        })
    })

    test.afterEach(async ({page, request}) => {
        await page.getByRole("button", {name: "Analytics"}).click()
        await waitForPipelineStopped(request)
    })

    test("connects live and renders sequence UI", async ({
        page,
        request,
    }) => {
        test.skip(
            (!backendHasCamera()),
            "backend has no camera, no frames to drive the UI"
        )
        await page.goto(CALIBRATION_ROUTE)

        await expect(page.getByText("Live", {exact: true})).toBeVisible({
            timeout: 20_000,
        })

        await expect
            .poll(async () => (await getCalibrationStatus(request)).status, {
                timeout: 10_000,
            })
            .toBe("in_progress")
        
        for (const gesture of PRETTY_SEQUENCE) {
            await expect(page.getByText(gesture).first()).toBeVisible()
        }
        await expect(page.getByText("Show:")).toBeVisible({timeout: 20_000})
    })

    test("progress UI updates while frames streeam in", async ({page}) => {
        test.skip(!backendHasCamera(), "backend has no camera, no frame to count")
        await page.goto(CALIBRATION_ROUTE)
        await expect(page.getByText("Live", {exact: true})).toBeVisible({
            timeout: 20_000,
        })

        const counter = page.getByText(/\d+\/\d+ frames/)
        await expect(counter).toBeVisible({timeout: 30_000})

        const readFrames = async () => {
            const text = (await counter.textContent()) ?? "0/0"
            return Number(text.split("/")[0])
        }
        const first = await readFrames()
        await expect.poll(readFrames, {timeout: 15_000}).toBeGreaterThan(first)

        await expect(
            page.getByText(/% of\s+recent frames must match/)
        ).toBeVisible()
    })

    test("skip calibration unlocks flight immediately", async ({
        page,
        request,
    }) => {
        test.skip(!backendHasCamera(), "backend has no camera, stream never goes live")
        await page.goto(CALIBRATION_ROUTE)
        await expect(page.getByText("Live", {exact: true})).toBeVisible({
            timeout: 20_000,
        })

        await page.getByText("Skip calibration").click()

        await expect 
            .poll(async () => (await getCalibrationStatus(request)).status, {
                timeout: 10_000,
            })
            .toBe("skipped")

        const status = await getCalibrationStatus(request)
        expect(status.is_calibrated).toBe(true)
    })

    test("calibration canvas renders backend frames", async ({page}) => {
        test.skip(
            (!backendHasCamera()),
            "backend has no camera, no frames to draw"
        )

        await page.goto(CALIBRATION_ROUTE)
        await expect(page.getByText("Live", {exact:true})).toBeVisible({
            timeout: 20_000,
        })

        const canvas = page.locator("canvas").first()
        await expect
            .poll(
                async () => 
                    canvas.evaluate((el: HTMLCanvasElement) => {
                        const ctx = el.getContext("2d")
                        if (!ctx || el.width === 0 || el.height === 0) return false
                        const data = ctx.getImageData(0, 0, el.width, el.height).data
                        for (let i=3; i<data.length; i+=4) {
                            if (data[i] !== 0) return true
                        }
                        return false
                    }),
                {timeout: 30_000}
            )
            .toBe(true)
    })
})

test.describe("gesture calibration (scripted camera)", () => {
    test.skip(
        !hasScriptedCamera,
        "attended run: set GBDC_TESTS_SCRIPTED_CAMERA=1 and perform the " +
        "gesture sequence on camera when the page connects"
    )

    test.beforeEach(async({page, request}) => {
        await request.post(`${API_BASE}/api/calibration/start`)
        await page.addInitScript(() => {
            localStorage.setItem("camera-consent", "granted")
        })
    })

    test.afterEach(async ({page, request}) => {
        await page.getByRole("button", {name: "Analytics"}).click()
        await waitForPipelineStopped(request)
    })

    test("full run: every gesture passes and flight unlocks", async ({
        page,
        request,
    }) => {
        test.setTimeout(180_000)

        await page.goto(CALIBRATION_ROUTE)
        await expect(page.getByText("Live", {exact:true})).toBeVisible({
            timeout: 20_000,
        })

        //perform sequence on camera, each chip must flip to done
        for (const gesture of PRETTY_SEQUENCE) {
            // pasted ✓ to look cleaner
            await expect(page.getByText(`✓ ${gesture}`).first()).toBeVisible({
                timeout: 60_000,
            })
        }

        //completion state
        await expect(page.getByText(/Calibration complete/)).toBeVisible({
            timeout: 30_000,
        })
        await expect(page.getByRole("button", {name:"Continue"})).toBeVisible()
        await expect(page.getByText("Complete", {exact: true})).toBeVisible()

        // skip link must go away once finihsed
        await expect(page.getByText("Skip calibration")).toHaveCount(0)

        //and the backend gate agrees
        const status = await getCalibrationStatus(request)
        expect(status.status).toBe("completed")
        expect(status.is_calibrated).toBe(true)
        expect(status.progress).toBeNull()
    })

    test("remount restarts the run from zero", async ({page, request}) => {
        await page.goto(CALIBRATION_ROUTE)
        await expect(
            page.getByText(`✓ ${PRETTY_SEQUENCE[0]}`).first()
        ).toBeVisible({timeout: 90_000})

        await page.getByRole("button", {name: "Analytics"}).click()
        await waitForPipelineStopped(request)
        await page.goto(CALIBRATION_ROUTE)

        await expect(page.getByText("Live", {exact:true})).toBeVisible({timeout: 20_000})

        await expect(page.getByText("Show:")).toBeVisible({timeout: 20_000})
        await expect(page.getByText(`✓ ${PRETTY_SEQUENCE[0]}`)).toHaveCount(0)

        const status = await getCalibrationStatus(request)
        expect(status.status).toBe("in_progress")
        expect(status.progress?.completed).toEqual([])
    })
})
