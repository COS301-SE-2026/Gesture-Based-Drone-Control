import{test,expect} from '@playwright/test'

test.describe('Gesture Guide',() =>{
    test.beforeEach(async ({page})=> {
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
    })

    test('should render the control guide heading', async ({page}) => {
        await expect(page.getByText(/control guide/i)).toBeVisible()
    })
    test('should show all four tab buttons',async ({page}) => {
        await expect(page.getByRole('button' , {name:/on screen/i })).toBeVisible()
        await expect(page.getByRole('main').getByRole('button' , {name:/^gestures$/i})).toBeVisible()
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



test.describe('Keyboard tab', () => {
    test.beforeEach(async ({page}) => {
        await page.getByRole('button', {name: /keyboard/i }).click()
    })

    test('keyboard tab should become activeeeee', async ({page}) => {
        const keyboardTab = page.getByRole('button' ,{name: /keyboard/i })
        await expect(keyboardTab).toHaveClass(/bg-Red/)
    })

    test('should show all 12 control labels with their mapped key', async ({page})=>{
        await expect(page.getByText(/move forward/i)).toBeVisible()
        await expect(page.getByText(/up key/i)).toBeVisible()
        await expect(page.getByText(/move backward/i)).toBeVisible()
        await expect(page.getByText(/down key/i)).toBeVisible()
        await expect (page.getByText('Move Left',{exact:true})).toBeVisible()
        await expect(page.getByText(/left key/i)).toBeVisible()
        await expect (page.getByText('Move Right',{exact:true})).toBeVisible()
        await expect(page.getByText(/right key/i)).toBeVisible()
        await expect(page.getByText(/increase altitude/i)).toBeVisible()
        await expect(page.getByText(/^w$/i)).toBeVisible()
        await expect(page.getByText(/decrease altitude/i)).toBeVisible()
        await expect(page.getByText(/^s$/i)).toBeVisible()
        await expect(page.getByText(/rotate left/i)).toBeVisible()
        await expect(page.getByText(/^a$/i)).toBeVisible()
        await expect(page.getByText(/rotate right/i)).toBeVisible()
        await expect(page.getByText(/^d$/i)).toBeVisible()
        await expect(page.getByText(/takeoff/i)).toBeVisible()
        await expect(page.getByText(/^t$/i)).toBeVisible()
        await expect(page.getByText(/^hover$/i)).toBeVisible()
        await expect(page.getByText(/space key/i)).toBeVisible()
        await expect(page.getByText(/^land$/i)).toBeVisible()
        await expect(page.getByText(/^l$/i)).toBeVisible()
        await expect(page.getByText(/emergency stop/i)).toBeVisible()
        await expect(page.getByText(/escape key/i)).toBeVisible()

    })
})


test.describe('Controller tab', () => {
    test.beforeEach(async({page})=> {
        await page.getByRole('button' , {name: /controller/i }).click()
    })

    test('controller tab should be active ',async ({page})=> {
        const controllerTab = page.getByRole ('button', {name: /controller/i})
        await expect(controllerTab).toHaveClass(/bg-Red/)
    })

    test('should show all 12 ctrl labels with their mapped inputs', async ({page}) => {
        await expect(page.getByText(/move forward/i)).toBeVisible()
        await expect(page.getByText(/l stick up/i)).toBeVisible()
        await expect(page.getByText(/move backward/i)).toBeVisible()
        await expect(page.getByText(/l stick down/i)).toBeVisible()
        await expect (page.getByText('Move Left',{exact:true})).toBeVisible()
        await expect(page.getByText(/l stick left/i)).toBeVisible()
        await expect (page.getByText('Move Right',{exact:true})).toBeVisible()
        await expect(page.getByText(/l stick right/i)).toBeVisible()
        await expect(page.getByText(/increase altitude/i)).toBeVisible()
        await expect(page.getByText(/r stick up/i)).toBeVisible()
        await expect(page.getByText(/decrease altitude/i)).toBeVisible()
        await expect(page.getByText(/r stick down/i)).toBeVisible()
        await expect(page.getByText(/rotate left/i)).toBeVisible()
        await expect(page.getByText(/r stick left/i)).toBeVisible()
        await expect(page.getByText(/rotate right/i)).toBeVisible()
        await expect(page.getByText(/r stick right/i)).toBeVisible()
        await expect(page.getByText(/takeoff/i)).toBeVisible()
        await expect(page.getByText(/triangle/i)).toBeVisible()
        await expect(page.getByText(/^hover$/i)).toBeVisible()
        await expect(page.getByText(/square/i)).toBeVisible()
        await expect(page.getByText(/^land$/i)).toBeVisible()
        await expect(page.getByText(/circle/i)).toBeVisible()
        await expect(page.getByText(/emergency stop/i)).toBeVisible()
        await expect(page.getByText(/cross/i)).toBeVisible()

    })
})

test.describe('Gesture tab' , () => {
    test.beforeEach(async({page}) => {
        await page.getByRole('main').getByRole('button' , {name:/^gestures$/i}).click()
    })

    test('should show all 12 control labels with "Not mapped" since no gesture input is defined', async ({page})=> {
        await expect(page.getByText(/move forward/i)).toBeVisible()
        await expect(page.getByText(/move backward/i)).toBeVisible()
        await expect (page.getByText('Move Left',{exact:true})).toBeVisible()
        await expect (page.getByText('Move Right',{exact:true})).toBeVisible()
        await expect(page.getByText(/increase altitude/i)).toBeVisible()
        await expect(page.getByText(/decrease altitude/i)).toBeVisible()
        await expect(page.getByText(/rotate left/i)).toBeVisible()
        await expect(page.getByText(/rotate right/i)).toBeVisible()
        await expect(page.getByText(/takeoff/i)).toBeVisible()
        await expect(page.getByText(/^hover$/i)).toBeVisible()
        await expect(page.getByText(/^land$/i)).toBeVisible()
        await expect(page.getByText(/emergency stop/i)).toBeVisible()

        await expect(page.getByText(/not mapped/i)).toHaveCount(12)
    })


    test('should switch between all tabs in sequence without losing the heading or tab bar', async ({page}) => {
        await page.getByRole ('button',{name: /keyboard/i }).click()
        await expect(page.getByText(/control guide/i)).toBeVisible()
        await page.getByRole ('button',{name: /controller/i }).click()
        await expect(page.getByText(/control guide/i)).toBeVisible()
        await page.getByRole('main').getByRole('button' , {name:/^gestures$/i}).click()
        await expect(page.getByText(/control guide/i)).toBeVisible()
        await page.getByRole ('button',{name: /on screen/i }).click()
        await expect(page.getByRole('button',{name:/emergency stop/i})).toBeVisible()


    })
})

})