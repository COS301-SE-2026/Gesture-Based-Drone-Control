import{test,expect} from '@playwright/test'

test.describe('Analytics', () =>{

    test.beforeEach(async({page})=>{
        await page.goto('/analytics')
        await page.waitForLoadState('domcontentloaded')
    })

    test('the top card labels show up', async ({page})=>{
        await expect(page.getByText(/flight time/i)).toBeVisible()
        await expect(page.getByText(/average speed/i)).toBeVisible()
        await expect(page.getByText(/max altitude/i)).toBeVisible()
    })

    test ('the card values at the top show up', async ({page})=> {
        await expect(page.getByText('21').first()).toBeVisible()
        await expect(page.getByText('8.2')).toBeVisible()
        await expect(page.getByText('53',{exact:true})).toBeVisible()
    })

    test ('chart headings show up',async ({page})=> {
        await expect(page.getByText(/flight telemetry/i)).toBeVisible()
        await expect(page.getByText(/battery health/i)).toBeVisible()
        await expect(page.getByText(/performance metrics/i)).toBeVisible()
    })

    test ('stats at the bottom show up',async ({page})=> {
        await expect(page.getByText(/total distance/i)).toBeVisible()
        await expect(page.getByText(/average flight duration/i)).toBeVisible()
        await expect(page.getByText(/total flights/i)).toBeVisible()
    })

     test ('the stats values at the bottom is rendered', async ({page})=> {
        await expect(page.getByText('7').first()).toBeVisible()
        await expect(page.locator('span').filter({hasText:'14'}).first()).toBeVisible()
        await expect(page.getByText('3.5')).toBeVisible()
    })

})