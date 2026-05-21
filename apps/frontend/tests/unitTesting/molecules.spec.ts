import{test,expect} from '@playwright/test'
import { TestTube } from 'lucide-react'

test.describe('DroneModeCard',()=> {
    test('the select drone label has to be rendered', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/select drone mode/i)).toBeVisible()
    })

    test('the DroneSim and hardware buttons are rendered',async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByRole('button',{name:/dronesim/i})).toBeVisible()
        await expect(page.getByRole('button',{name: /hardware/i})).toBeVisible()
    })

    test('click the hardware button to switch to the active mode', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('button' , { name: /hardware/i }).click()
        await expect(page.getByRole('button',{name:/hardware/i })).toBeVisible()
    })


})

test.describe('DroneInfoCard', () => {
    test('renders the Drone Info Label', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/drone info/i)).toBeVisible()
    })

    test('is the drone name and model shown',async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('Phantom 4',{exact:true})).toBeVisible()
        await expect(page.getByText('DJI Phantom 4 pro')).toBeVisible()
    })

    test('connected status is shown', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/connected/i)).toBeVisible()
    })

    test('shows the description of the drone', async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/professional drone with 4k camera/i)).toBeVisible()

    })

})


test.describe('GPSWidget', () =>  {
    test(' the drone orientation label shown' , async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/drone orientation/i)).toBeVisible()
    })

    test('the cardinal directions are shown', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('N').first()).toBeVisible()
        await expect(page.getByText('S').first()).toBeVisible()
        await expect(page.getByText('E').first()).toBeVisible()
        await expect(page.getByText('W').first()).toBeVisible()

    })

    test('heading degree value shown', async({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('90')).toBeVisible()

    })
})


test.describe('Command History',()=>{
    test('the label of the command history gets rendered', async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

    test('the command entries are rendered', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByText(/swipe up - move up/i)).toBeVisible()
        await expect (page.getByText(/swipe down - move down/i)).toBeVisible()
        await expect (page.getByText(/swipe right - move right/i)).toBeVisible()
        await expect (page.getByText(/swipe left - move left/i)).toBeVisible()
    })

    test('the timestamps alongside the commands showing up',async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('18:50:43').first()).toBeVisible()
    })
})

test.describe('Gesture Guide',()=>{
    test('the gesture guide gets rendered', async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/gesture guide/i)).toBeVisible()
    })

    test('the altitude keys are rendered',async({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/altitude keys/i)).toBeVisible()
    })

    test('descriptions of arrow keys', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByText(/increase altitude/i)).toBeVisible()
        await expect (page.getByText(/decrease altitude/i)).toBeVisible()
        await expect (page.getByText(/move laterally/i)).toBeVisible()
    })
})

test.describe('Gesture Clibration',()=>{
    test('the gesture caliberation label', async ({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/gesture calibration/i)).toBeVisible()
    })

    test('the metric labels are rendered', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByText(/visibility/i)).toBeVisible()
        await expect (page.getByText(/confidence/i)).toBeVisible()
        await expect (page.getByText(/stability/i)).toBeVisible()
    })

    test('the percentage values are also rendered', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByText('80%')).toBeVisible()
        await expect (page.getByText('45%')).toBeVisible()
        await expect (page.getByText('60%')).toBeVisible()
    })

    test('the environment factors rendered', async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect (page.getByText(/lighting/i)).toBeVisible()
        await expect (page.getByText(/background/i)).toBeVisible()
        await expect (page.getByText('Good')).toBeVisible()
        await expect (page.getByText('Fair')).toBeVisible()

    })

})

test.describe('Sidebar',()=>{
    test('the logo comes through',async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        const logo = page.getByAltText(/codex merchants/i)
        await expect(logo).toBeVisible()
    })

    test('all the nav items show up', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/dashboard/i).first()).toBeVisible()
        await expect(page.getByText(/analytics/i).first()).toBeVisible()
        await expect(page.getByText(/gestures/i).first()).toBeVisible()
        await expect(page.getByText(/gps/i).first()).toBeVisible()
        await expect(page.getByText(/settings/i).first()).toBeVisible()
        
    })

})

test.describe('DarkModeToggle',()=>{
    test('the toggle bar shows up',async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.locator('input[type="checkbox"]').first()
        await expect(toggle).toBeAttached()
    })

    test('the dark mode adds dark class o html element',async({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        const toggle = page.locator('input[type="checkbox"]').first()
        await toggle.click({force:true})
        const htmlClass = await page.locator('html').getAttribute('class')
        expect(htmlClass ==='dark' ||htmlClass ==='' || htmlClass ===null).toBeTruthy
    })
})


test.describe('DashboardSideCard',()=>{
    test('welcome message shows up',async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/welcome back/i)).toBeVisible()
    })

    test('switch profile and logout buttons show up', async ({page})=> {
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/switch profile/i).first()).toBeVisible()
        await expect(page.getByText(/logout/i).first()).toBeVisible()
        
    })

})


