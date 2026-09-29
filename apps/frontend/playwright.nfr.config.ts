import {defineConfig, devices} from "@playwright/test"

const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
    testDir: "./tests/nfr",
    testMatch: /.*\.nfr\.spec\.ts/,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    forbidOnly: !!process.env.CI,
    timeout: 15 * 60 * 1000,
    reporter: [
        ["list"],
        ["html", {outputFolder: "playwright-report-nfr", open: "never"}],
    ],
    use: {
        baseURL: "http://localhost:4173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                viewport: {width: 1366, height: 768},
                launchOptions: {executablePath},
            },
        },
    ],
    webServer: {
        command: "yarn build && yarn preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
        env: {BACKENDPORT: "3001"},
    },
})