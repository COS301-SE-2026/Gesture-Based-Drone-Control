import{test,expect}from '@playwright/test'

test.describe('gesture control page aka dashboard', () =>{
    test.beforeEach(async ({ page}) => {
        await page.route('**/api/drone/connect', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ connected: true, message: 'Connected successfully' })
            })
        })

        await page.route('**/api/drone/disconnect', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true })
            })
        })

        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')

    })

    test.describe('header and nav tests', () => {
        test('gesture detection heading is rendered',async ({page}) =>{
            await expect(page.getByText(/gesture detection/i)).toBeVisible()
        })

        test('active status indicator shows',async ({page})=>{
            await page.addInitScript(()=>{
                class FakeWebSocket{
                    onopen:(() => void)|null=null
                    onclose:(() =>void )|null=null
                    onerror:(() =>void )|null=null
                    onmessage:((event:MessageEvent) => void)| null=null

                    constructor(){
                        setTimeout(() => {
                            this.onopen?.()
                        },0)
                    }

                    close(){
                        this.onclose?.()
                    }
                    send(){}
                }
                window.WebSocket = FakeWebSocket as unknown as typeof WebSocket
            })

            await page.goto('/gestures')
            await page.waitForLoadState('domcontentloaded')

            await expect(page.getByText(/active/i)).toBeVisible()
            const dot =page.locator('.w-2.h-2.bg-green-500')
            await expect(dot).toBeVisible()
        })
    })

    //TODO: update this testing later when command history is live
    //changing this whole component to be a more info type of thing so ill leave the testing out till i make the new component
    test ('command history entries', async ({ page }) => {
        await page.getByText('Command History').click()
        // const historyItems = page.locator(`[class*="command-history"] li, [class*="CommandHistory] li`)
        // await expect(historyItems.first()).toBeVisible()
        // const count = await historyItems.count()
        // expect(count).toBeGreaterThan(0)
        test.skip()
    })

    test('stat labels returned' , async ({page})=>{
        await expect(page.getByText(/battery/i)).toBeVisible()
        await expect(page.getByText(/signal/i)).toBeVisible()
        await expect(page.getByText(/speed/i)).toBeVisible()
        await expect(page.getByText(/altitude/i)).toBeVisible()
    })

    test('the correct values are returned in the stats parts' , async ({page})=>{
        //check vals exist
        //batt
        const batttext = page.locator('text=/\\d+%|--%/').first()
        await expect(batttext).toBeVisible()

        const sign = page.getByText('100%')
        await expect(sign).toBeVisible()

        const speedy = page.locator('text=/(\\d+\\.?\\d*|--)\\s*km\\/h/').first()
        await expect(speedy).toBeVisible()

        const alt = page.locator('text=/(\\d+\\.?\\d*|--)\\s*m/').first()
        await expect(alt).toBeVisible()

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
            const batttext = page.locator('text=/\\d+%|--%/').first()
            await expect(batttext).toBeVisible()

            const sign = page.getByText('100%')
            await expect(sign).toBeVisible()

            const speedy = page.locator('text=/(\\d+\\.?\\d*|--)\\s*km\\/h/').first()
            await expect(speedy).toBeVisible()

            const alt = page.locator('text=/(\\d+\\.?\\d*|--)\\s*m/').first()
            await expect(alt).toBeVisible()
        })

        test('icons show on stats card', async ({ page }) => {
            const batt = page.locator('svg[class*="lucide-battery"]')
            await expect(batt).toBeAttached()
            const wifi = page.locator('svg[class*="lucide-wifi"]')
            await expect(wifi).toBeAttached()
            const gauge = page.locator('svg[class*="lucide-gauge"]')
            await expect(gauge).toBeAttached()
            const mount = page.locator('svg[class*="lucide-mountain"]')
            await expect(mount).toBeAttached()
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

    test.describe('gesture guide card tests', () => {
        test('component is rendered', async ({ page }) => {
            await expect(page.getByText('Control Guide')).toBeVisible()
        })
    })

    



})