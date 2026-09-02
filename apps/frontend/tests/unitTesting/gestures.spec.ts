import{test,expect, Page}from '@playwright/test'

async function mockAuth(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('authToken', 'test-token')
    })
}

test.describe('gesture control page aka dashboard', () =>{
    test.beforeEach(async ({ page}) => {
        await mockAuth(page)
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

        await page.goto('/#/app/gestures')
        await page.waitForLoadState('domcontentloaded')

    })

    test.describe('header and nav tests', () => {
        test('gesture detection heading is rendered',async ({page}) =>{
            await expect(page.getByText(/gesture detection/i)).toBeVisible()
        })

        test('active status indicator shows',async ({page})=>{
            await mockAuth(page)
            await page.addInitScript(()=>{
                class FakeWebSocket{
                    onopen:(() => void)|null=null
                    onclose:(() =>void )|null=null
                    onerror:(() =>void )|null=null
                    onmessage:((event:MessageEvent) => void)| null=null

                    constructor(){
                        setTimeout(() => {
                            this.onopen?.()
                        },100)
                    }

                    close(){
                        this.onclose?.()
                    }
                    send(){}
                }
                window.WebSocket = FakeWebSocket as unknown as typeof WebSocket
            })

            await page.route('**/api/drone/connect', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({ connected: true, message: 'connected successfully'})
                })
            })

            await page.route('**/api/drone/disconnect', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({ success: true })
                })
            })

            await page.goto('/#/app/gestures')
            await page.waitForLoadState('domcontentloaded')
            await page.waitForTimeout(1000)

        })
    })

test.describe('command history card', () => {

    test('is collapsed by default', async ({ page }) => {
        await expect(page.getByText('Command History')).toBeVisible()
        
        const cont = page.locator('.transition-all.duration-300.ease-in-out.overflow-hidden')
        await expect(cont).toHaveClass(/max-h-0 opacity-0/)
    })

    test ('expands on clcik', async ({ page }) => {
        const trigger = page.getByText('Command History')
        await expect(trigger).toBeVisible();
        
        await trigger.click()
        await page.waitForTimeout(500)
        await expect (page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible()

    
    })

    test ('clicking an entry inside the card doesnt collapse the card', async ({page}) => {
        await page.getByText('Command History').click()
        await page.waitForTimeout(500)
        await expect (page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible()
        const entry = page.getByText(/\d{2}:\d{2}:\d{2}/).first()
        await entry.click()
        await expect(page.getByText(/\d{2}:\d{2}:\d{2}/).first()).toBeVisible()
        
        
    })


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

        const sign = page.getByText('text=/\\d+%|--%/').first()
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

            const sign = page.locator('text=/\\d+%|--%/').first()
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