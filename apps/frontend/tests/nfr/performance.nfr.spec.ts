/*
Frotned perfromance nfr testing

QR-50 / NFR1.3 -> dashboard renders the live gesture feed at >=24 fps and paints
>= 99% of the frames it receives

QR-51 / NFR1.1 -> every screen: first paint <= 1.8s and largest paint <= 2.5s

QR-52 / NFR1.1 -> on-screen control click -> command confirmed in the command history
, p95 <= 2--ms
*/

import {expect, Page, test} from "@playwright/test"
import {
    emit,
    mockBackend,
    screenshot,
    summarize,
    writeSamples,
} from "./nfr-helpers"

const TARGET_REDNER_FPS = 24
const TARGET_PAINTED_PCT = 99
const TARGET_FCP_MS = 1800
const TARGET_LCP_MS = 2500
const TARGET_FEEDBACK_MS = 200
const RENDER_SECONDS = Number(process.env.GBDC_NFR_RENDER_SECONDS ?? 30)

test("QR-50 dashbaord renders the livefeed at >= 24 fps", async ({page}) => {
    test.setTimeout((RENDER_SECONDS + 60) * 1000)

    await page.addInitScript(() => {
        const w = window as unknown as {
            __draws: number[]
            __longTasks: number[]
            __arrivals: number[]
        }
        w.__draws = []
        w.__longTasks = []
        w.__arrivals = []
        //timestamp every gesture frame as the app parses it, independent of how the socket is provided
        const parse = JSON.parse.bind(JSON)
        JSON.parse = ((
            text: string,
            reviver?: (k: string, v: unknown) => unknown
        ): unknown => {
            const original = CanvasRenderingContext2D.prototype.drawImage
            CanvasRenderingContext2D.prototype.drawImage = function (
                this: CanvasRenderingContext2D,
                ...args: unknown[]
            ) {
                if (this.canvas?.closest?.('[data-testid="gesture-camera-feed]'))
                    w.__draws.push(performance.now())
                Reflect.apply(original, this, args)
            }
            try {
                new PerformanceObserver((list) => {
                    for (const e of list.getEntries()) w.__longTasks.push(e.duration)
                }).observe({type: "longtask", buffered: true})
            } catch {
                //longtask unsupported
            }
        })

        let sent = 0
        const mock = await mockBackend(page, {
            gestureFps: 30,
            onFrameSent: () => (sent += 1),
        })
        await page.goto("/#/app/gestures")
        await expect(page.getByTestId("gesture-camera-feed")).toBeVisible()

        await page.waitForFunction(
            () => (window as unknown as { __draws: number[]}).__draws.length > 60,
            null,
            {
                timeout: 30_000,
            }
        )

        const t0 = await page.evaluate(() => performance.now())
        const sent0 = sent
        await page.waitForTimeout(RENDER_SECONDS * 1000)
        const t1 = await page.evaluate(() => performance.now())
        const sent1 = sent
        const {draws, longTasks, arrivals} = await page.evaluate(() => {
            const w = window as unknown as {
                __draws: number[]
                __longTasks: number[]
                __arrivals: number[]
            }
            return {
                draws: w.__draws,
                longTasks: w.__longTasks,
                arrivals: w.__arrivals,
            }
        })
        mock.stop()

        const windowDraws = draws.filter((t) => t >= t0 && t <= t1)
        const seconds = (t1 - t0) / 1000
        const renderFps = Number((windowDraws.length / seconds).toFixed(1))
        const windowArrivals = arrivals.filter((t) => t >= t0 && t <= t1)
        const received = windowArrivals.length
        const painted = windowDraws.length
        const arrivalGaps = windowArrivals
            .slice(1)
            .map((t, i) => t - windowArrivals[i])
            // 2 frames landing within 8ms of eachother
        const bursts = arrivalGaps.filter((g) => g < 8).length
        const paintedPct = received
            ? Number(Math.min(100, (100 * painted) / received).toFixed(2))
            : 0
        const gaps = windowDraws.slice(1).map((t, i) => t - windowDraws[i])

        const perSecond: number[] = []
        for (let s = 0; s < Math.floor(seconds); s++) {
            perSecond.push(
                windowDraws.filter((t) => t >= t0 + s * 1000 && t < t0 + (s + 1) * 1000)
                    .length
            )
        }

        const shot = await screenshot(page, "QR-50-dashboard-live-feed")
        const passed = 
            renderFps >= TARGET_REDNER_FPS && paintedPct >= TARGET_PAINTED_PCT
        writeSamples("QR-50", {
            second: perSecond.map((_, i) => i),
            rendered_fps: perSecond,
        })
        emit(
            page,
            "QR-50",
            "NFR1.3",
            "dashboard live-feed frames painted per second (fps)",
            renderFps,
            `>= ${TARGET_REDNER_FPS} fps and >= ${TARGET_PAINTED_PCT}% of received frames painted`,
            passed,
            {
                window_s: Number(seconds.toFixed(1)),
                frames_sent: sent1 - sent0,
                frames_received: received,
                arrival_gap_ms: summarize(arrivalGaps),
                back_to_back_arrivals: bursts,
                frames_painted: painted,
                painted_pct: paintedPct,
                frame_gap_ms: summarize(gaps),
                long_tasks: {
                    count: longTasks.length,
                    worst_ms: longTasks.length ? Math.max(...longTasks) : 0,
                },
                screenshot: shot,
                method:
                "The real dashboard receives 30 fps GestureFramePayload messages " +
                "(real 640x480 JPEG frames + hand landmarks) over the gesture WebSocket. Every canvas " +
                "drawImage of a frame is counted, and every message is timestamped as it reaches page. " +
                "Painted $ = frames painted / frames recieved in the same window. ",
            chart: {
                kind: "series",
                column: "rendered_fps",
                unit: "fps",
                threshold: TARGET_REDNER_FPS,
            },
            }
        )
        expect(renderFps, "rendered fps").toBeGreaterThanOrEqual(TARGET_REDNER_FPS)
        expect(paintedPct, "painted %").toBeGreaterThanOrEqual(TARGET_PAINTED_PCT)
    })

    const ROUTES = [
        ["login", "/#/login"],
        ["signup", "/#/signup"],
        ["dashboard", "/#/gestures"],
        ["analytics", "/#/analytics"],
        ["gps", "/#/app/gps"],
        ["games", "/#/app/games"],
        ["settings", "/#/app/settings"],
        ["help", "/#/app/help"],
        ["tutorial", "/#/app/tutorial"],
    ] as const

    test("QR-51 every screen paints within core web vital limits", async ({
        playwright,
    }, testInfo) => {
        test.setTimeout(5 * 60 * 1000)
        const rows: {
            route: string
            fcp: number
            lcp: number
            dcl: number
            kb: number
        } [] = []
        let evidencePage: Page | null = null

        const order =
            process.env.GBDC_NFR_ROUTE_ORDER === "reverse"
                ? [...ROUTES].reverse()
                : ROUTES
        for (const [name, route] of order) {
            if (evidencePage) await evidencePage.context().browser()?.close()
            const browser = await playwright.chromium.launch(
                testInfo.project.use.launchOptions
            )
            const context = await browser.newContext({
                viewport: { width: 1366, height: 768},
                baseURL: testInfo.project.use.baseURL,
            })
            const page = await context.newPage()
            const mock = await mockBackend(page)
            await page.goto(route, {waitUntil: "load"})
            await page.waitForTimeout(1500)
            const m = await page.evaluate(async () => {
                const lcp = await new Promise<number>((resolve) => {
                    let value = 0
                    new PerformanceObserver((list) => {
                        for (const e of list.getEntries())
                            value = Math.max(value, e.startTime)
                    }).observe({type: "largest-contentful-paint", buffered: true})
                    setTimeout(() => resolve(value), 300)
                })
                const fcp =
                    performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
                    0
                const nav = performance.getEntriesByType(
                    "navigation"
                )[0] as PerformanceNavigationTiming
                const bytes = performance
                    .getEntriesByType("resource")
                    .reduce(
                        (a, r) => a + ((r as PerformanceResourceTiming).transferSize || 0),
                        nav?.transferSize ?? 0
                    )
                return {fcp, lcp, dcl: nav?.domContentLoadedEventEnd ?? 0, bytes}
            })
            rows.push({
                route: name,
                fcp: Math.round(m.fcp),
                lcp: Math.round(m.lcp || m.fcp),
                dcl: Math.round(m.dcl),
                kb: Math.round(m.bytes / 1024),
            })
            mock.stop()
            if (name === "dashboard")
                await screenshot(page, "QR-51-dashboard-cold-load")
            evidencePage = page
        }

        const worstFcp = Math.max(...rows.map((r) => r.fcp))
        const worstLcp = Math.max(...rows.map((r) => r.lcp))
        const passed = worstFcp <= TARGET_FCP_MS && worstLcp <= TARGET_LCP_MS
        writeSamples("QR-51", {
            screen: rows.map((r) => r.route),
            lcp_ms: rows.map((r) => r.lcp),
            fcp_ms: rows.map((r) => r.fcp),
        })
        if (!evidencePage) throw new Error("no screen was measured")
        emit(
        evidencePage,
        "QR-51",
        "NFR1.1",
        "slowest screen: largest contentful paint, cold start (ms)",
        worstLcp,
        `LCP <= ${TARGET_LCP_MS}, FCP <= ${TARGET_FCP_MS} on every screen`,
        passed,
        {
            worst_fcp_ms: worstFcp,
            per_screen: rows,
            method:
                "Each screen opened in a vrand new browser process from the " +
                "production build, as when the desktop app launches. FCP and LCP are read from the " +
                "browsers own Paint timing and largest contentful paint apis",
            chart: {
                kind: "bars",
                column: "lcp_ms",
                label: "screen",
                unit: "ms",
                threshold: TARGET_LCP_MS,
            },
        }
        )
        await evidencePage.context().browser()?.close()
        expect(worstFcp).toBeLessThanOrEqual(TARGET_FCP_MS)
        expect(worstLcp).toBeLessThanOrEqual(TARGET_LCP_MS)
    })

    test("QR-52 on-screen controls confirm a command within 200 ms", async ({
        page,
    }) => {
        await mockBackend(page)
        await page.goto('/#/app/gestures')
        await page.getByRole("button", {name: /^DroneSim$/}).click()

        await page.evaluate(() => {
            const w = window as unknown as {
                __clickAt: number
                __expect: string
                __feedback: number[]
            }
            w.__feedback = []
            document.addEventListener(
                "click",
                () => (w.__clickAt = performance.now()),
                true
            )
            new MutationObserver((mutations) => {
                if (!w.__expect) return
                for (const m of mutations) {
                    const text = [...m.addedNodes].map((n) => n.textContent ?? "").join(" ")
                    if (text.includes(w.__expect)) {
                        w.__feedback.push(performance.now() - w.__clickAt)
                        w.__expect = ""
                        return
                    }
                }
            }).observe(document.body, {childList: true, subtree: true})
        })

        const buttons: [string, string][] = [
            ["lucide_plane_takeoff", "TAKEOFF"],
            ["lucide-arrow-up", "MOVE_FORWARD"],
            ["lucide-arrow-left", "MOVE_LEFT"],
            ["lucide-circle-dot", "HOVER"],
            ["lucide-arrow-right", "MOVE-RIGHT"],
            ["lucide-arrow-down", "MOVE_BACKWARD"],
            ["lucide-plane-landing", "LAND"],
        ]
        const sequence = [
            buttons[0],
            ...Array.from({length: 4}, () => buttons.slice(1, 6)).flat(),
            buttons[6],
        ]
        let missed = 0
        for (const [icon, command] of sequence) {
            const button = page.locator(`button:has(svg.${icon})`).first()
            await expect(button).toBeEnabled({timeout: 5000})
            const before = await page.evaluate(
                () => (window as unknown as { __feedback: number[]}).__feedback.length
            )
            await page.evaluate(
                (c) => ((window as unknown as {__expect: string}).__expect = c),
                command
            )
            await button.click()
            try {
                await page.waitForFunction(
                    (n) => 
                    (window as unknown as {__feedback: number[]}).__feedback.length > n,
                    before,
                    {timeout: 2000}
                )
            } catch {
                missed += 1
            }
            await page.waitForTimeout(150)
        }

        const feedback = await page.evaluate(
            () => (window as unknown as {__feedback: number[]}).__feedback
        )
        const stats = summarize(feedback)
        const p95 = "p95" in stats ? stats.p95 : Infinity
        const passed = p95 <= TARGET_FEEDBACK_MS && missed === 0
        writeSamples("QR-52", {feedback_ms: feedback})
        emit(
            page,
            "QR-52",
            "NFR1.1",
            "p95 click -> command shown in Command History (ms)",
            p95,
            `<= ${TARGET_FEEDBACK_MS}, every click confirmed`,
            passed,
            {
                stats,
                clicks: sequence.length,
                unconfirmed_clicks: missed,
                method:
                    "Clocks the on screen take off,D pad and land buttons. Time from the click event to the " +
                    "command appearing in Command History, i.e. UI ->. command WebSocket -> re-render",
                chart: {
                    kind: "historgram",
                    column: "feedback_ms",
                    unit: "ms",
                    threshold: TARGET_FEEDBACK_MS,
                },
            }
        )
        expect(missed, "clicks without feedback").toBe(0)
        expect(p95).toBeLessThanOrEqual(TARGET_FEEDBACK_MS)
    })
})