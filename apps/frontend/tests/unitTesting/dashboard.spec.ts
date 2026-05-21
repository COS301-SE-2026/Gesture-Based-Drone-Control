import {test,expect} from '@playwright/test'

test.describe('Dashboard', ()=> {
    test.beforeEach(async ({page})=>{
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')
    })

    test('stat labels returned' , async ({page})=>{
        await expect(page.getByText(/battery/i)).toBeVisible()
        await expect(page.getByText(/signal/i)).toBeVisible()
        await expect(page.getByText(/speed/i)).toBeVisible()
        await expect(page.getByText(/altitude/i)).toBeVisible()
    })

    test('the coreect values are returned in the stats parts' , async ({page})=>{
        await expect(page.getByText('56%')).toBeVisible()
        await expect(page.getByText('71%')).toBeVisible()
        await expect(page.getByText('5.6 km/h')).toBeVisible()
        await expect(page.getByText('72m')).toBeVisible()
    })

    test('the camera place holder and timer shows ',async ({page})=>{
        await expect(page.getByText('02:12')).toBeVisible()
    })

    test('drone name and model is visible', async ({page})=>{
        await expect(page.getByText('Phantom 4',{exact:true})).toBeVisible()
        await expect(page.getByText('DJI Phantom 4 pro',{exact:true})).toBeVisible()
    })

    test('selection buttons of the drone shows up',async ({page})=>{
        await expect(page.getByRole('button', {name:/dronesim/i})).toBeVisible()
        await expect(page.getByRole('button', {name:/hardware/i})).toBeVisible()
    })

    test('gps compas shows up',async({page})=>{
        await expect(page.getByText(/drone orientation/i)).toBeVisible()
        await expect(page.getByText('90')).toBeVisible()
    })


})