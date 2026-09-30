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

    test("an adapter that ignores the stream leaves the recognizer alone", async ({
        request,
    }) => {
        await setRecognizerMode(request, "motion")

        const body = await connectInput(request, "keyboard")

        expect(body.recognizer).toBeNull()
        expect((await getRecognizerMode(request)).mode).toBe("motion")
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

        await page
        .getByRole("main")
        .getByRole("button", {name: "Motion", exact: true})
        .click()
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
        await page
        .getByRole("main")
        .getByRole("button", {name: "Gestures", exact: true})
        .click()

        await page.goto(SETTINGS_ROUTE)
        await page.getByRole("button", {name: "Rule"}).click()
        await page.goto(MOTION_ROUTE)
        await page
        .getByRole("main")
        .getByRole("button", {name: "Gestures", exact: true})
        .click()

        await expect
            .poll(
                async () => (await getInputStatus(request)).adapter, {
                timeout: 20_000
            })
            .toBe("gesture")
        
        await waitForPipelineStopped(request).catch(() => {})
    })

    test.describe("motion mode recognizer coupling (camera required)", () => {
        test.skip(
            ({browserName}) => browserName !== "chromium",
            "shared backend state, one browser is enough"
        )
        test.skip(
            !backendHasCamera(),
            "connecting a gesture adapter opens the camera"
        )

        test.afterEach(async ({request}) => {
            await disconnectInput(request)
            await setRecognizerMode(request, "rule")
        })
    })
})