import {test,expect} from '@playwright/test'

test.describe('Card',()=>{
    test('the card containers are rendered on the dashboard page', async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const cards = page.locator('.rounded-xl')
        await expect(cards.first()).toBeVisible()
    })

    test('the card containers are rendered on the analytics page',async({page})=>{
        await page.goto('/analytics')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/flight telemetry/i)).toBeVisible()
    })

})


test.describe('Labels', ()=>{
    test('stats table rendering on the dashboard page', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/stats/i)).toBeVisible()// the /..../i thing like checks for differnt capitalizations
    })

    test('The CommandHistory label shows up on the gesture page',async({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

})

