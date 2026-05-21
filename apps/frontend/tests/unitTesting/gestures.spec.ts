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

    test ('gesture guide section shows up', async ({page})=> {
        await expect(page.getByText(/gesture guide/i)).toBeVisible()
        await expect(page.getByText(/altitude keys/i)).toBeVisible()
    })

    test('gesture calibration section shows up',async ({page})=>{
        await expect(page.getByText(/gesture calibration/i)).toBeVisible()
        await expect(page.getByText('80%')).toBeVisible()
        await expect(page.getByText('45%')).toBeVisible()
        await expect(page.getByText('60%')).toBeVisible()
    })
})