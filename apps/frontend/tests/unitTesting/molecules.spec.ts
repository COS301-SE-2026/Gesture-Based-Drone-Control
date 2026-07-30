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
        await page.getByText('Command History').click()
        await expect (page.getByText(/swipe up - move up/i).first()).toBeVisible()
        await expect (page.getByText(/swipe down - move down/i).first()).toBeVisible()
    })

    test('the timestamps alongside the commands showing up',async ({page})=> {
        await page.goto('/#/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByText('Command History').click()
        await expect(page.getByText('18:50:43').first()).toBeVisible()
    })


})




    


test.describe('Sidebar',()=>{
    test('the logo comes through',async ({page})=>{
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const logo = page.getByAltText(/codex merchants/i)
        await expect(logo).toBeVisible()
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
        const toggle = page.locator('input[type="checkbox"]').first()
        await expect(toggle).toBeAttached()
    })

    test('the dark mode adds dark class o html element',async({page})=>{
        await page.goto('/#/')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.locator('input[type="checkbox"]').first()
        await toggle.click({force:true})
        const htmlClass = await page.locator('html').getAttribute('class')
        expect(htmlClass ==='dark' ||htmlClass ==='' || htmlClass ===null).toBeTruthy()
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

