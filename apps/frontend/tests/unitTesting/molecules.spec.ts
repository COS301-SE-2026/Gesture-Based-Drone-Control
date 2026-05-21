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
