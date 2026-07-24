import{test,expect} from '@playwright/test'

test.describe('Analytics', () =>{

    test.beforeEach(async({page})=>{
        await page.route('**/api/analytics/flights*', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify([
                    {duration_min: 21 },
                    {duration_min: 18 },
                    {duration_min: 25 },
                    {duration_min: 19 },
                    {duration_min: 22 },
                    {duration_min: 20 },
                    {duration_min: 23 },
                ])
            })
        })
    
        await page.goto('/analytics')
        await page.waitForLoadState('domcontentloaded')
    })

    test('the top card labels show up', async ({page})=>{
        await expect(page.getByText(/Total Flights/i).first()).toBeVisible()
        await expect(page.getByText(/Average speed/i)).toBeVisible()
        await expect(page.getByText(/Max Altitude \(session\)/i)).toBeVisible()
    })

    test ('the card values at the top show up', async ({page})=> {
        const topGrid = page.locator('div.grid-cols-3').first()
        const vals = topGrid.locator('span.text-2xl')
        await expect(vals).toHaveCount(3)

        for (let i = 0; i < 3; i++) {
            const text = await vals.nth(i).textContent()
            expect(text).toMatch(/^\d+\.?\d*$|^--$/)
        }
    })

    test ('chart headings show up',async ({page})=> {
        await expect(page.getByText(/Live Speed \(this session\)/i)).toBeVisible()
        await expect(page.getByText(/Battery Health \(this session\)/i)).toBeVisible()
        await expect(page.getByText(/Performance Metrics \(recent flights\)/i)).toBeVisible()
    })

    test ('stats at the bottom show up',async ({page})=> {
        await expect(page.getByText(/Total Distance/i)).toBeVisible()
        await expect(page.getByText(/Average Flight Duration/i)).toBeVisible()
        await expect(page.getByText(/Total Flights/i).last()).toBeVisible()
    })

     test ('the stats values at the bottom is rendered', async ({page})=> {
        const bottom = page.locator('div.grid-cols-3').nth(1)
        const vals = await bottom.locator('span.text-2xl').allTextContents()
        expect(vals.length).toBe(3)

        vals.forEach(val => {
            expect(val).toMatch(/^\d+\.?\d*$|^--$/)
        })
    })

})