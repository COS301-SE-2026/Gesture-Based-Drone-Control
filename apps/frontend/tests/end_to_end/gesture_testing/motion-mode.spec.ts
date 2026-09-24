import {test, expect} from "@playwright/test"
import {
    MOTION_ROUTE,
    SETTINGS_ROUTE,
    backendHasCamera,
    connectInput,
    disconnectInput,
    getInputStatus,
    getRecognizerMode,
    setRecognizerMode,
    waitForPipelineStopped,
} from "./gesture-helpers"

test.describe.configure({mode: "serial"})

/*
The recognizer and the input adapter have to agree on a vocab
Motion reports gesture names that the pose adapter has no mapping 
for, so picking one without the other resolves no commands at all
and says nothing about why. These cover both halves of that coupling
*/

test.describe("motion mode (no camera needed)", () => {
    test.skip(
        ({browserName}) => browserName !== "chromium",
        "shared backend state, one browser is enough"
    )

    test.afterEach(async ({request}) => {
        await disconnectInput(request)
        await setRecognizerMode(request, 'rule')
    }) 

    test("motion is offered as a recognizer mode", async ({request}) => {
        const body = await getRecognizerMode(request)

        expect(body.available).toContain("motion")
    })

    test("connecting the motion adapter pulls the recognizer with it", async ({
        request,
    }) => {
        await setRecognizerMode(request, "rule")

        const body = await connectInput(request, "motion")

        expect(body.connected).toBe(true)
        expect(body.recognizer).toBe("motion")
        expect((await getRecognizerMode(request)).mode).toBe("motion")
    })

    test("connecting the pose adapter switches back off motion", async ({
        request,
    }) => {
        await setRecognizerMode(request, "motion")

        const body = await connectInput(request, "gesture")

        expect(body.recognizer).toBe("rule")
        expect((await getRecognizerMode(request)).mode).toBe("rule")
    })

    test("an adapter that ignores the stream leaves the recognizer alone", async ({
        request,
    }) => {
        await setRecognizerMode(request, "motion")

        const body = await connectInput(request, "keyboard")

        expect(body.recognizer).toBeNull()
        expect((await getRecognizerMode(request)).mode).toBe("motion")
    })

    test("switching the recognizer under a mismatched adapter warns", async ({
        request,
    }) => {
        await connectInput(request, "motion")

        const body = await setRecognizerMode(request, "rule")

        expect(body.warning).toBeTruthy()
        expect(body.warning).toContain("motion")
    })

    test("a compatible switch does not warn", async ({request}) => {
        await setRecognizerMode(request, "rule")
        await connectInput(request, "gesture")

        const body = await setRecognizerMode(request, "ml")

        expect(body.warning).toBeNull()
    })
})

test.describe("recognizer selector in settings", () => {
    test.skip(
        ({browserName}) => browserName !== "chromium",
        "shared backend state, one browser is enough"
    )

    test.beforeEach(async ({page, request}) => {
        await setRecognizerMode(request, "rule")
        await page.addInitScript(() => {
            localStorage.setItem("camera-consent", "granted")
        })
    })

    test.afterEach(async ({request}) => {
        await disconnectInput(request)
        await setRecognizerMode(request, "rule")
    })

    test("offers all three recognizers", async({page}) => {
        await page.goto(SETTINGS_ROUTE)

        await expect(page.getByRole("button", {name: "Rule"})).toBeVisible()
        await expect(page.getByRole("button", {name: "ML"})).toBeVisible()
        await expect(page.getByRole("button", {name: "Motion"})).toBeVisible()
    })

    test("picking motion switches the backend", async ({page, request}) => {
        await page.goto(SETTINGS_ROUTE)

        await page.getByRole("button", {name: "Motion"}).click()

        await expect
            .poll(async () => (await getRecognizerMode(request)).mode, {
                timeout: 10_000,
            })
            .toBe("motion")
    })

    test("the selected mode is marked pressed", async ({page}) => {
        await page.goto(SETTINGS_ROUTE)

        const motion = page.getByRole("button", {name: "Motion"})
        await motion.click()
        
        await expect(motion).toHaveAttribute("aria-pressed", "true", {
            timeout: 10_000,
        })
    })

    test("picking motion connects the motion input adapter", async ({
        page,
        request,
    }) => {
        test.skip(!backendHasCamera(), "no camera, gesture tab never connects")

        await page.goto(SETTINGS_ROUTE)
        await page.getByRole("button", {name: "Motion"}).click()

        await page.goto(MOTION_ROUTE)

        await page.getByRole("button", {name: "Gestures", exact: true}).click()
        await expect
            .poll(
                async () => (await getInputStatus(request)).adapter, {
                    timeout: 20_000,
                })
            .toBe("motion")
    })

    test("going back to rule reconnects the pose adapter", async ({
        page,
        request,
    }) => {
        test.skip(!backendHasCamera(), "no camera, gesture tab never connects")

        await page.goto(SETTINGS_ROUTE)
        await page.getByRole("button", {name: "Motion"}).click()
        await page.goto(MOTION_ROUTE)
        await page.getByRole("button", {name: "Gestures", exact: true}).click()

        await page.goto(SETTINGS_ROUTE)
        await page.getByRole("button", {name: "Rule"}).click()
        await page.goto(MOTION_ROUTE)
        await page.getByRole("button", {name: "Gestures", exact: true}).click()

        await expect
            .poll(
                async () => (await getInputStatus(request)).adapter, {
                timeout: 20_000
            })
            .toBe("gesture")
        
        await waitForPipelineStopped(request).catch(() => {})
    })
})