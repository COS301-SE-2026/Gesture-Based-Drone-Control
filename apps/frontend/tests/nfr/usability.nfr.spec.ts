/*
QR-53 / U3, WCAG 2.2 4.1.2 -> every control on every screen has an accessible

QR-54 / U3, WCAG 2.2 2.4.7 -> keyboard-only users can see where focus is on

QR-55 / R1.1.2 -> recognised gesture and the command it maps to are
visible without scrolling on common laptop screens, and no screen scrolls sideways

QR-56 / NFR5.1-> the basic flight (take-off, hover, move, land) is a handful of clicks 
and every click is confirmed
 */

import { expect, Page, test } from "@playwright/test"
import { emit, mockBackend, screenshot, writeSamples } from "./nfr-helpers"

const SCREENS = [
  ["login", "/#/login"],
  ["signup", "/#/signup"],
  ["dashboard", "/#/app/gestures"],
  ["analytics", "/#/app/analytics"],
  ["gps", "/#/app/gps"],
  ["games", "/#/app/games"],
  ["settings", "/#/app/settings"],
  ["help", "/#/app/help"],
  ["tutorial", "/#/app/tutorial"],
] as const

const CONTROL_ROLES =
  "button|link|textbox|checkbox|radio|combobox|slider|switch|tab|menuitem|spinbutton|searchbox"

async function unnamedControls(page: Page) {
  const tree = await page.locator("body").ariaSnapshot()
  const control = new RegExp(
    `^\\s*- (${CONTROL_ROLES}|img)(\\s*\\[[^\\]]*\\])*:?$`
  )
  const named = new RegExp(`^\\s*- (${CONTROL_ROLES}|img) "`)
  const lines = tree.split("\n")
  return {
    total: lines.filter((l) => control.test(l) || named.test(l)).length,
    unnamed: lines.filter((l) => control.test(l)).map((l) => l.trim()),
  }
}

test("QR-53 every control has an accessible name", async ({ page }) => {
  await mockBackend(page)
  const perScreen: Record<
    string,
    { total: number; unnamed: number; examples: string[] }
  > = {}
  for (const [name, route] of SCREENS) {
    await page.goto(route)
    await page.waitForTimeout(1200)
    const result = await unnamedControls(page)
    perScreen[name] = {
      total: result.total,
      unnamed: result.unnamed.length,
      examples: [...new Set(result.unnamed)].slice(0, 5),
    }
  }
  await page.goto("/#/app/gestures")
  await page.waitForTimeout(800)
  const shot = await screenshot(page, "QR-53-dashboard-icon-only-controls")

  const total = Object.values(perScreen).reduce((a, s) => a + s.total, 0)
  const unnamed = Object.values(perScreen).reduce((a, s) => a + s.unnamed, 0)
  const pct = Number(
    ((100 * (total - unnamed)) / Math.max(1, total)).toFixed(1)
  )
  const passed = unnamed === 0

  writeSamples("QR-53", {
    screen: Object.keys(perScreen),
    named: Object.values(perScreen).map((s) => s.total - s.unnamed),
    unnamed: Object.values(perScreen).map((s) => s.unnamed),
  })
  emit(
    page,
    "QR-53",
    "U3 / WCAG 4.1.2",
    "controls and images with an accessible name (%)",
    pct,
    "100",
    passed,
    {
      controls: total,
      unnamed_controls: unnamed,
      per_screen: perScreen,
      screenshot: shot,
      method:
        "Reads Chromium's own accessibility tree (what a screen reader or voice-control user " +
        "gets) on every screen and counts buttons, links, inputs, tabs and images with no name.",
      chart: {
        kind: "bars",
        column: "unnamed",
        label: "screen",
        unit: "unnamed controls",
        threshold: 0,
      },
    }
  )
  expect(unnamed, `unnamed controls: ${JSON.stringify(perScreen)}`).toBe(0)
})

async function focusAudit(page: Page, maxStops = 60) {
  const stops: { label: string; visible: boolean }[] = []
  const seen = new Set<string>()
  await page.locator("body").click({ position: { x: 1, y: 1 } })
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press("Tab")
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const look = () => {
        const cs = getComputedStyle(el)
        return [
          cs.outlineStyle,
          cs.outlineWidth,
          cs.outlineColor,
          cs.boxShadow,
          cs.borderColor,
          cs.backgroundColor,
          cs.color,
          cs.textDecorationLine,
        ].join("|")
      }
      const cs = getComputedStyle(el)
      const ring =
        (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== "none"
      const focused = look()
      el.blur()
      const unfocused = look()
      el.focus({ preventScroll: true })
      const text = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.getAttribute("placeholder") ||
        ""
      ).trim()
      const r = el.getBoundingClientRect()
      return {
        key: `${el.tagName}|${text}|${Math.round(r.x)}|${Math.round(r.y)}`,
        label: `${el.tagName.toLowerCase()} "${text.slice(0, 30)}"`,
        visible: focused !== unfocused && (ring || focused !== unfocused),
      }
    })
    if (!stop) continue
    if (seen.has(stop.key)) break
    seen.add(stop.key)
    stops.push({ label: stop.label, visible: stop.visible })
  }
  return stops
}

test("QR-54 keyboard focus is always visible", async ({ page }) => {
  await mockBackend(page)
  const screens: Record<string, { label: string; visible: boolean }[]> = {}
  for (const [name, route] of [
    ["login", "/#/login"],
    ["dashboard", "/#/app/gestures"],
  ] as const) {
    await page.goto(route)
    await page.waitForTimeout(1200)
    screens[name] = await focusAudit(page)
  }
  await page.goto("/#/login")
  await page.waitForTimeout(800)
  await page.keyboard.press("Tab")
  const shot = await screenshot(page, "QR-54-login-first-tab-stop")

  const all = Object.values(screens).flat()
  const invisible = all.filter((s) => !s.visible)
  const pct = Number(
    ((100 * (all.length - invisible.length)) / Math.max(1, all.length)).toFixed(
      1
    )
  )
  const passed = all.length > 0 && invisible.length === 0

  emit(
    page,
    "QR-54",
    "U3 / WCAG 2.4.7",
    "keyboard tab stops with a visible focus indicator (%)",
    pct,
    "100",
    passed,
    {
      tab_stops: all.length,
      per_screen: Object.fromEntries(
        Object.entries(screens).map(([k, v]) => [
          k,
          {
            stops: v.length,
            invisible: v.filter((s) => !s.visible).map((s) => s.label),
          },
        ])
      ),
      screenshot: shot,
      method:
        "Presses Tab through the login screen and the dashboard. At each stop the element's " +
        "outline, box-shadow, border, background and text colour are compared focused vs " +
        "unfocused; no difference means a keyboard user cannot see where they are.",
    }
  )
  expect(invisible.map((s) => s.label)).toEqual([])
})

const LAPTOPS = [
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1920x1080", width: 1920, height: 1080 },
]

test("QR-55 gesture and command visible without scrolling", async ({
  page,
}) => {
  await mockBackend(page, { gestureFps: 10 })
  const results: Record<string, Record<string, unknown>> = {}
  const shots: string[] = []

  for (const vp of LAPTOPS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto("/#/app/gestures")
    await page.waitForTimeout(1500)
    const layout = await page.evaluate(() => {
      const fold = window.innerHeight
      const visibleShare = (el: Element | null) => {
        if (!el) return 0
        const r = el.getBoundingClientRect()
        const shown = Math.max(0, Math.min(r.bottom, fold) - Math.max(r.top, 0))
        return r.height ? shown / r.height : 0
      }
      const feed = document.querySelector('[data-testid="gesture-camera-feed"]')
      const heading = [...document.querySelectorAll("*")].find(
        (e) =>
          e.children.length === 0 &&
          /^command history$/i.test(e.textContent?.trim() ?? "")
      )
      const estop = [...document.querySelectorAll("button")].find((b) =>
        /emergency stop/i.test(b.textContent ?? "")
      )
      return {
        gesture_feed_visible: Number(visibleShare(feed).toFixed(2)),
        command_history_top_px: heading
          ? Math.round(heading.getBoundingClientRect().top)
          : null,
        command_history_visible: visibleShare(heading ?? null) === 1,
        emergency_stop_visible: visibleShare(estop ?? null) === 1,
        viewport_height: fold,
      }
    })
    results[vp.name] = layout
    shots.push(await screenshot(page, `QR-55-dashboard-${vp.name}`))
  }

  await page.setViewportSize({ width: 1024, height: 768 })
  const overflow: string[] = []
  for (const [name, route] of SCREENS) {
    await page.goto(route)
    await page.waitForTimeout(800)
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    if (wide) overflow.push(name)
  }

  const ok = (r: Record<string, unknown>) =>
    (r.gesture_feed_visible as number) >= 0.5 &&
    r.command_history_visible === true
  const compliant = Object.values(results).filter(ok).length
  const passed = compliant === LAPTOPS.length && overflow.length === 0

  emit(
    page,
    "QR-55",
    "R1.1.2",
    "screen sizes showing gesture AND mapped command without scrolling",
    `${compliant}/${LAPTOPS.length}`,
    `${LAPTOPS.length}/${LAPTOPS.length}, no sideways scrolling at 1024 px`,
    passed,
    {
      per_viewport: results,
      sideways_scroll_at_1024: overflow,
      screenshots: shots,
      method:
        "Dashboard rendered at common laptop resolutions with a live gesture stream. The gesture " +
        "overlay (camera feed) must be at least half on screen and the Command History heading, " +
        "where the mapped command appears, fully on screen, with no scrolling. Every screen is " +
        "also checked for horizontal overflow at 1024x768.",
    }
  )
  expect(results, "layout per viewport").toBeTruthy()
  expect(overflow, "screens that scroll sideways at 1024 px").toEqual([])
  expect(compliant, JSON.stringify(results)).toBe(LAPTOPS.length)
})

test("QR-56 basic flight takes a handful of confirmed clicks", async ({
  page,
}) => {
  const mock = await mockBackend(page)
  await page.goto("/#/app/gestures")
  const started = Date.now()
  const steps: { action: string; confirmed: boolean }[] = []

  type Loc = ReturnType<Page["locator"]>
  const click = async (action: string, locator: Loc, confirm: string | Loc) => {
    await expect(locator).toBeEnabled({ timeout: 5000 })
    await locator.click()
    let confirmed = true
    try {
      const proof =
        typeof confirm === "string"
          ? page.getByText(confirm, { exact: false }).first()
          : confirm
      await expect(proof).toBeVisible({ timeout: 1000 })
    } catch {
      confirmed = false
    }
    steps.push({ action, confirmed })
  }

  await click(
    "choose drone mode",
    page.getByRole("button", { name: /^DroneSim$/ }),
    page.getByRole("button", { name: "Disconnect drone" })
  )
  await click(
    "take off",
    page.locator("button:has(svg.lucide-plane-takeoff)"),
    "TAKEOFF"
  )
  await click(
    "hover",
    page.locator("button:has(svg.lucide-circle-dot)"),
    "HOVER"
  )
  await click(
    "move forward",
    page.locator("button:has(svg.lucide-arrow-up)"),
    "MOVE_FORWARD"
  )
  await click(
    "land",
    page.locator("button:has(svg.lucide-plane-landing)"),
    "LAND"
  )
  const elapsed = (Date.now() - started) / 1000
  const shot = await screenshot(page, "QR-56-after-basic-flight")

  const unconfirmed = steps.filter((s) => !s.confirmed).map((s) => s.action)
  const passed =
    steps.length <= 6 && unconfirmed.length === 0 && !mock.isFlying()
  emit(
    page,
    "QR-56",
    "NFR5.1",
    "clicks to complete take-off, hover, move, land on screen",
    steps.length,
    "<= 6 clicks, each confirmed within 1 s, drone landed",
    passed,
    {
      steps,
      unconfirmed,
      automated_run_s: Number(elapsed.toFixed(1)),
      drone_landed: !mock.isFlying(),
      screenshot: shot,
      method:
        "Scripted walk-through of the basic flight on the on-screen pad. Counts interactions and " +
        "checks each one is confirmed on screen (Command History) within 1 s. The human time for " +
        "the same task comes from the usability study (QR-45).",
    }
  )
  expect(unconfirmed).toEqual([])
  expect(steps.length).toBeLessThanOrEqual(6)
})
