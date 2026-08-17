import {test,expect} from '@playwright/test'

test.describe('CursorGlow', () => {
    test.beforeEach(async ({page}) =>{
        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')
    })

    test('the glow element is present on the page', async ({ page }) => {
        const glow =  page.locator('.cursor-glow')
        await expect(glow).toBeAttached()

    })

    test('the glow does not intercept clicks', async ({page}) => {
        const glow = page.locator('.cursor-glow')
        await expect(glow).toHaveCSS('pointer-events', 'none')
    })

    test('the glow follows the cursor position', async ({page}) => {
        const glow = page.locator('.cursor-glow')
        await page.mouse.move(300,200)
        await expect.poll(async () => {
            return glow.evaluate((el) => (el as HTMLElement).style.transform)
        }).toContain('300px, 200px, 0px')
    })

    test('the glow is hidden when reduced motion is preffered', async ({page}) => {
        await page.emulateMedia({ reducedMotion:'reduce'})
        await page.reload()
        await page.waitForLoadState('domcontentloaded')
        const glow = page.locator('.cursor-glow')
        await expect(glow).toBeHidden()
    })

})