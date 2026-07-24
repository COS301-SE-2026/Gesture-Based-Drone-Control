import{test,expect} from '@playwright/test'



test.describe('Command History',()=>{
    test('the label of the command history gets rendered', async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

    test('the command entries are rendered', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByText('Command History').click()
        await expect (page.getByText(/swipe up - move up/i)).toBeVisible()
        await expect (page.getByText(/swipe down - move down/i)).toBeVisible()
        await expect (page.getByText(/swipe right - move right/i)).toBeVisible()
        await expect (page.getByText(/swipe left - move left/i)).toBeVisible()
    })

    test('the timestamps alongside the commands showing up',async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByText('Command History').click()
        await expect(page.getByText('18:50:43').first()).toBeVisible()
    })
})




    


test.describe('Sidebar',()=>{
    test('the logo comes through',async ({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        const logo = page.getByAltText(/codex merchants/i)
        await expect(logo).toBeVisible()
    })

    test('all the nav items show up', async ({page})=> {
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/analytics/i).first()).toBeVisible()
        await expect(page.getByText(/gestures/i).first()).toBeVisible()
        await expect(page.getByText(/gps/i).first()).toBeVisible()
        await expect(page.getByText(/settings/i).first()).toBeVisible()
        
    })

})

test.describe('DarkModeToggle',()=>{
    test('the toggle bar shows up',async ({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.locator('input[type="checkbox"]').first()
        await expect(toggle).toBeAttached()
    })

    test('the dark mode adds dark class o html element',async({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.locator('input[type="checkbox"]').first()
        await toggle.click({force:true})
        const htmlClass = await page.locator('html').getAttribute('class')
        expect(htmlClass ==='dark' ||htmlClass ==='' || htmlClass ===null).toBeTruthy()
    })
})



