import{test,expect} from '@playwright/test'

test.describe('Gesture Guide',() =>{
    test.beforeEach(async ({page})=> {
        await page.goto('/gesture')
        await page.waitForLoadState('domcontentloaded')
    })

    test('should render the control guide heading', async ({page}) => {
        await expect(page.getByText(/control guide/i)).toBeVisible()
    })

    test('should show all four tab buttons man',async ({page}) => {
        await expect(page.getByRole('button' , {name:/on screen/i })).toBeVisible()
        await expect(page.getByRole('button' , {name:/^gestures$/i })).toBeVisible()
        await expect(page.getByRole('button' , {name:/keyboard/i })).toBeVisible()
        await expect(page.getByRole('button' , {name:/controller/i })).toBeVisible()
    })

    test('the on screen tab should be active by default', async ({page}) => {
        const onScreenTab = page.getByRole('button' , { name: /on screen/i })
        await expect(onScreenTab).toHaveClass(/bg-Red/)
    })

    test.describe('On screen tab', () => {
        test('the emergency stop button should be visible', async ({page}) => {
            await expect (page.getByRole('button', {name: /emergency stop/i})).toBeVisible()
        })
    })

    test('clicking the emergency stop button should mark itactive(red) , and it should start out grey showing that its inactive', async ({page}) => {
        const emergencyStop = page.getByRole('button', {name: /emergency stop/i})
        await expect(emergencyStop).toHaveClass(/bg-DarkGrey/)
        await emergencyStop.click()
        await expect(emergencyStop).toHaveClass(/bg-Red/)
    })

    test('on screen buttons should be enabled and clickable without breaking the page', async ({page}) => {
        const emergencyStop = page.getByRole('button',{name: /emergency stop/i })
        await expect(emergencyStop).toBeEnabled()
        await emergencyStop.click()
        await expect(page.getByText(/control guide/i)).toBeVisible()
    })

})

test.describe('Keyboard tab', () => {
    test.beforeEach(async ({page}) => {
        await page.getByRole('button', {name: /keyboard/i }).click()
    })

    test('keyboard tab should become activeeeee', async ({page}) => {
        const keyboardTab = page.getByRole('button' ,{name: /keyboard/i })
        await expect(keyboardTab).toHaveClass(/bg-Red/)
    })

    
})