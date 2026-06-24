import{test,expect}from '@playwright/test'

test.describe('gesture', () =>{
    test.beforeEach(async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
    })

    test('gesture detection heading',async ({page}) =>{
        await expect(page.getByText(/gesture detection/i)).toBeVisible()
    })

    test('active status indicator shows',async ({page})=>{
        await expect(page.getByText(/active/i)).toBeVisible()
    })

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

})