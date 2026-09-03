import {test,expect} from '@playwright/test'

test.describe('Tutorial Page' ,() =>{
    test('the gesture controls section renders with the carousel', async ({page}) => {
        await page.goto ('/#/app/tutorial')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('Gesture Controls')).toBeVisible()
        await expect(page.getByText(/open-palm - hover/i)).toBeVisible()
    })

    test('the tutorial videos section renders with the video card' , async ({page}) =>{
        await page.goto('/#/app/tutorial')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('Tutorial Videos')).toBeVisible()
        await expect(page.getByText(/flying with theh gesture adapter/i)).toBeVisible()
        await expect(page.getByText(/same flight, controlled entirely by hand gestures/i)).toBeVisible()
    })
})