import{test,expect}from '@playwright/test'

test.describe('gesture control page aka dashboard', () =>{
    test.beforeEach(async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
    })

    test.describe('header and nav tests', () => {
        test('gesture detection heading is rendered',async ({page}) =>{
            await expect(page.getByText(/gesture detection/i)).toBeVisible()
        })

        test('active status indicator shows',async ({page})=>{
        await expect(page.getByText(/active/i)).toBeVisible()
        const dot = page.locator('.w-2.h-2.bg-green-500')
        await expect(dot).toBeVisible()
        })
    })

    //changing this whole component to be a more info type of thing so ill leave the testing out till i make the new component
    test ('command history entries', async ({page})=>{
        await expect(page.getByText(/swipe up - move up/i)). toBeVisible()
        await expect(page.getByText(/swipe down - move down/i)). toBeVisible()
        await expect(page.getByText(/swipe right - move right/i)). toBeVisible()
        await expect(page.getByText(/swipe left - move left/i)). toBeVisible()
    })

    test('stat labels returned' , async ({page})=>{
        await expect(page.getByText(/battery/i)).toBeVisible()
        await expect(page.getByText(/signal/i)).toBeVisible()
        await expect(page.getByText(/speed/i)).toBeVisible()
        await expect(page.getByText(/altitude/i)).toBeVisible()
    })

    test('the correct values are returned in the stats parts' , async ({page})=>{
        await expect(page.getByText('56%')).toBeVisible()
        await expect(page.getByText('71%')).toBeVisible()
        await expect(page.getByText('5.6 km/h')).toBeVisible()
        await expect(page.getByText('72m')).toBeVisible()
    })

    test('selection buttons of the drone shows up',async ({page})=>{
        await expect(page.getByRole('button', {name:/dronesim/i})).toBeVisible()
        await expect(page.getByRole('button', {name:/hardware/i})).toBeVisible()
    })

    test.describe('drone state card', () => {
        test('all stat labels shows', async ({ page }) => {
            const stats = ['Battery', 'Signal', 'Speed', 'Altitude']
            for (const stat of stats) {
                await expect(page.getByText(stat, { exact: true })).toBeVisible()
            }
        })

        // these tests will get replaced once mock data is no longer used
        test('metric vals are displaying', async ({ page }) => {
            await expect(page.getByText('56%', {exact: true})).toBeVisible()
            await expect(page.getByText('71%', {exact: true})).toBeVisible()
            await expect(page.getByText('5.6 km/h', {exact: true})).toBeVisible()
            await expect(page.getByText('72m', {exact: true})).toBeVisible()

        })

        test('icons show on stats page', async ({ page }) => {
            const icons = [
                page.locator('[data-icon="battery"]'),
                page.locator('[data-icon="gauge"]'),
                page.locator('[data-icon="wifi"]'),
                page.locator('[data-icon="mountain"]')
            ]
            for (const icon of icons) {
                await expect(icon).toBeVisible()
            }
        })
    })

    test.describe('drone mode selection card testing', () => {
        test('both modes buttons display', async ({ page }) => {
            const simbtn = page.getByRole('button', { name: /dronesim/i})
            const hardbtn = page.getByRole('button', { name: /hardware/i })
            await expect(simbtn).toBeVisible()
            await expect(hardbtn).toBeVisible()
        })

        test('drone buttons click', async ({ page }) => {
            const simbtn = page.getByRole('button', { name: /dronesim/i})
            const hardbtn = page.getByRole('button', { name: /hardware/i })
            await simbtn.click()
            await expect(simbtn).toBeVisible()
            await hardbtn.click()
            await expect(hardbtn).toBeVisible()
        })
    })

    



})