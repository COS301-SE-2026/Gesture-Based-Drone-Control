import {test,expect} from '@playwright/test'

test.describe('Card',()=>{
    test('the card containers are rendered on the dashboard page', async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        const cards = page.locator('.rounded-xl')
        await expect(cards.first()).toBeVisible()
    })

    test('the card containers are rendered on the analytics page',async({page})=>{
        await page.goto('/analytics')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/flight telemetry/i)).toBeVisible()
    })

})


test.describe('Labels', ()=>{
    test('stats table rendering on the dashboard page', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/stats/i)).toBeVisible()// the /..../i thing like checks for differnt capitalizations
    })

    test('The CommandHistory label shows up on the gesture page',async({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

})

test.describe('NavItem', ()=>{
    test('the nav items in the siide bar are rendered', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
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


    test.describe('Button',()=>{
        test('does it show the droneSim and the Hardware mode buttons on the dashboard??',async({page})=>{
            await page.goto('/dashboard')
            await page.waitForLoadState('domcontentloaded')
            await expect(page.getByRole('button',{name: /dronesim/i})).toBeVisible()
            await expect(page.getByRole('button',{name: /hardware/i})).toBeVisible()
        })

        test(' Hardware Button clickable??', async({page})=>{
            await page.goto('/dashboard')
            await page.waitForLoadState('domcontentloaded')
            const hardwareBtn = page.getByRole('button',{name:/hardware/i })
            await expect(hardwareBtn).toBeEnabled()
            await hardwareBtn.click()
            await expect(hardwareBtn).toBeVisible()//so like it shouldnt disappear like after we click it...
        })

    })

    
        test('the state must actually chnage when its clicked on',async ({page})=>{
            await page.goto('/dashboard')
            await page.waitForLoadState('domcontentloaded')
            const toggle=page.locator('input[type="checkbox"]').first()
            const initialState = await toggle.isChecked()
            const toggleLabel= page.locator('label').filter({
                has: page.locator('input[type="checkbox"]')
            }).first()
            await toggleLabel.click({force:true})
            const newState = await toggle.isChecked()
            expect(newState).toBe(!initialState)
        })
    })

    test.describe('StatusDot',()=>{
        test('shows if the state is connected or not ', async ({page})=>{
            await page.goto('/dashboard')
            await page.waitForLoadState('domcontentloaded')
            await expect(page.getByText(/connected/i)).toBeVisible()

        })
    })




