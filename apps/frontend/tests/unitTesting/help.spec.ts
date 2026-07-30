import { test, expect } from '@playwright/test'

test.describe('Help Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/help');
        await page.waitForLoadState('domcontentloaded');
    });

    test('shold redner the help page heading', async ({ page }) => {
        await expect(page.getByText(/browse by topic/i)).toBeVisible()
    })

    test('should show all topic cards', async ({ page }) => {
        await expect(page.getByText(/set up & sign in/i)).toBeVisible()
        await expect(page.getByText(/fly with hand gestures/i)).toBeVisible()
        await expect(page.getByText(/telemetry & live updates/i)).toBeVisible()
        await expect(page.getByText(/practivce in airsim/i)).toBeVisible()
        await expect(page.getByText(/gesture vocabulary/i)).toBeVisible()
        await expect(page.getByText(/troubleshooting/i)).toBeVisible()
    })

    test('should show the help resource buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: /user manual/i})).toBeVisible()
        await expect(page.getByRole('button', { name: /tutorial/i})).toBeVisible()
    })

    test('should show all FAQ items', async ({ page }) => {
        await expect(page.getByText(/the drone won't take off when i gesture - why\?/i)).toBeVisible()
        await expect(page.getByText(/why does the drone just hover on its own\?/i)).toBeVisible()
        await expect(page.getByText(/my hand isn't being tracked properly on screen/i)).toBeVisible()
        await expect(page.getByText(/what happens if the battery gets low mid-flight\?/i)).toBeVisible()
        await expect(page.getByText(/can i try this without an actual drone\?/i)).toBeVisible()
        await expect(page.getByText(/how do i stop the drone immediately\?/i)).toBeVisible()
    })

    test('should show the contact card', async ({ page }) => {
        await expect(page.getByText(/email support/i)).toBeVisible()
        await expect(page.getByText(/codexmerchants@gmail.com/i)).toBeVisible()
    })

    
})
