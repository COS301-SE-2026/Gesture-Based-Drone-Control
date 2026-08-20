import{test,expect} from '@playwright/test'



test.describe('Command History',()=>{
    test('the label of the command history gets rendered', async ({page})=>{
        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

    test('the command entries are rendered', async ({page})=> {
        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.waitForSelector('[class*="CommandHistory"]', { timeout: 5000 })
        const historyLabel = page.getByText('Command History')
        await historyLabel.click()
        await page.waitForTimeout(500)
        const command = page.getByText(/swipe up - move up|swipe down - move down/i)
        await expect(command.first()).toBeVisible({ timeout: 10000 })
    })

    test('the timestamps alongside the commands showing up',async ({page})=> {
        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByText('Command History').click()
        await page.waitForTimeout(500)
        const time = page.getByText(/\d{2}:\d{2}:\d{2}/).first()
        await expect(time).toBeVisible({ timeout: 10000 })
    })
})


test.describe('Sidebar',()=>{
    test('the logo comes through',async ({page})=>{
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const logo = page.getByAltText(/codex merchants/i)
        await expect(logo).toBeVisible({ timeout: 10000 })
    })

    test('all the nav items show up', async ({page})=> {
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/analytics/i).first()).toBeVisible()
        await expect(page.getByText(/gestures/i).first()).toBeVisible()
        await expect(page.getByText(/gps/i).first()).toBeVisible()
        await expect(page.getByText(/settings/i).first()).toBeVisible()
        
    })

})

test.describe('DarkModeToggle',()=>{
    test('the toggle bar shows up',async ({page})=>{
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.getByRole('button' , {name: /switch to (light|dark) mode/i})
        await expect(toggle).toBeVisible()
    })

    test('clicking the button flips the data theme attribute on html?', async({page}) => {
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const html = page.locator('html')
        const before=await html.getAttribute('data-theme')
        const toggle = page.getByRole('button', {name:/switch to (light|dark) mode/i})
       await toggle.click()
       await page.waitForTimeout(300)
       const after = await html.getAttribute('data-theme')
       expect(after).not.toBe(before)

    })

    test ('the aria-label updates after toggling', async ({page}) => {
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.getByRole('button', {name:/switch to (light|dark) mode/i})
        const labelBefore = await toggle.getAttribute('aria-label')
        await toggle.click()
        const labelAfter = await toggle.getAttribute('aria-label')
        expect(labelAfter).not.toBe(labelBefore)
    })
})

test.describe('HandSkeleton',() => {
    test('test hand landmark svg renders for the current gesture', async ({page}) => {
        await page.goto ('/#/tutorial')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByRole('img',{name:/hand landmark skeleton showing the current gesture/i})).toBeVisible()
    })
})

test.describe('GestureTargetSkeleton',() =>{
    test('the idle taget pose shows before the gesture is matched' ,async({page}) =>{
        await page.goto('/#/tutorial')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/try the gesture/i)).toBeVisible()
        await expect(page.getByRole('img' , {name:/hand landmark skeleton showing the current gesture/i})).toBeVisible()
    })
})

test.describe('GestureTutorialCarousel' , () =>{
    test('the first gesture name and progress counter render' ,async ({page}) => {
        await page.goto('/#/tutorial')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/open-palm - hover/i)).toBeVisible()
        await expect(page.getByText('1/12')).toBeVisible()
    })

    test('the hint button toggles the instructions text', async ({page})=>{
        await page.goto('/#/tutorial')
        await page.waitForLoadState('domcontentloaded')
        const hintButton = page.getByRole('button',{name:'Hint'})
        await expect(page.getByText(/show an open palm to hold the drone's current position/i)).not.toBeVisible()
        await hintButton.click()
        await expect(page.getByText(/show an open palm to hold the drone's current position/i)).toBeVisible()
        await expect(page.getByRole('button',{name:/hide hint/i})).toBeVisible()
    })

    test('the next button stays disabled until the gesture is matched', async ({page})=>{
        await page.goto('/#/tutorial')
        await page.waitForLoadState('domcontentloaded')
        const nextButton = page.getByRole('button',{name:'Next'})
        await expect(nextButton).toBeDisabled()
    })
})

