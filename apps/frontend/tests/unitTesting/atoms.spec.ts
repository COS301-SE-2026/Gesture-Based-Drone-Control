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

test.describe('NavItem', ()=>{
    test('the nav items in the siide bar are rendered', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/dashboard/i)).toBeVisible()
        await expect(page.getByText(/analytics/i)).toBeVisible()
        await expect(page.getByText(/gestures/i)).toBeVisible()

    })

    test('when the analytics button in the navbar is clicked, it navigates to the analytics page', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('button',{name:/analytics/i }).click()
        await expect(page).toHaveURL(/analytics/)
    })

    test('when the gestures item is clicked it goes into the gestures page', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('button',{name:/gestures/i }).click()
        await expect(page).toHaveURL(/gestures/)
    })


    




})


