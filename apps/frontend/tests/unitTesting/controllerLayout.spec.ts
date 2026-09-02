import{test, expect, Page} from "@playwright/test"

/*So basically since this is just unit TestTubes, it will have a fake gamepad so that individual tests can like affect/mutate 
the button or part of the controller.*/

interface MockGameButton{
    pressed:boolean
    touched:boolean
    value: number
}

interface MockGamepad{
    id:string
    index: number
    connected:boolean
    mapping:string
    buttons: MockGameButton[]
    axes:number[]
    timestamp:number
}

interface MockWindow extends Window {
    __mockPad:MockGamepad
}

async function mockAuth(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('authToken', 'test-token')
    })
}

async function mockGamepad(page: Page) {
    await page.addInitScript(() => {
        const mockPad={
            id: 'Mock controller',
            index:0,
            connected:true,
            mapping: 'standard',
            buttons:Array.from({length:17}, () => ({ pressed: false, touched:false, value:0})),
            axes:[0,0,0,0],
            timestamp:performance.now(),
        }

        ;(window as unknown as MockWindow).__mockPad =mockPad
        navigator.getGamepads = (() => [mockPad]) as unknown as typeof navigator.getGamepads
    })
}

test.describe('ControllerLayout',() => {
    test.beforeEach(async({page}) =>{
        await mockAuth(page)
        await page.goto('/#/app/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('button',{name:/controller/i}).click()
    })

    test('shows "No controller detected" when nothing is plugged in',async ({page}) => {
        await expect(page.getByText(/no controller detected/i)).toBeVisible()
    })

    test('renders the axis labels for both sticks',async ({page}) => {
        await expect(page.getByText('Axis 0')).toBeVisible()
        await expect(page.getByText('Axis 1')).toBeVisible()
    })

    test('renders the select and start labels',async({page})=>{
        await expect(page.getByText('SELECT',{exact:true})).toBeVisible()
        await expect(page.getByText('START',{exact:true})).toBeVisible()
    })

    test.describe('with a mock gamepad connected', () =>{
        test.beforeEach(async({page}) => {
            await mockAuth(page)
            await mockGamepad(page)
            await page.reload()
            // await page.goto('/#/app/gestures')
            await page.waitForLoadState('domcontentloaded')
            await page.getByRole('button', {name:/controller/i}).click()
        })

        test('shows thhat the controller is connected once the poll loop picks up',async ({page}) =>{
            await expect(page.getByText(/controller connected/i)).toBeVisible()
        })

        test('pressing the cross button should highlight it red' ,async ({page}) => {
            const crossBtn =page.getByTestId('btn-cross')
            await expect(crossBtn).not.toHaveClass(/fill-Red/)
            await page.evaluate(()=>{
                ;(window as unknown as MockWindow).__mockPad.buttons[0].pressed =true
            })
            await expect(crossBtn).toHaveClass(/fill-Red/)
        })

        test('pressing d-pad up highlights that arm..well it should...,not the down one',async({page})=>{
            const up = page.getByTestId('dpad-up')
            const down = page.getByTestId('dpad-down')

            await page.evaluate(() => {
                ;(window as unknown as MockWindow).__mockPad.buttons[12].pressed =true
            })

            await expect(up).toHaveClass(/fill-Red/)
            await expect(down).not.toHaveClass(/fill-Red/)
        })

        test('pushing the left stick fully right moves the knob to the right edge..hopefully',async ({page}) =>{
            const knob = page.getByTestId('stick-left-knob')
            const initialCx =Number(await knob.getAttribute('cx'))

            await page.evaluate(() =>{
                ;(window as unknown as MockWindow).__mockPad.axes[0] =1
            })

            await expect
            .poll(async()=>Number(await knob.getAttribute('cx')))
            .toBeGreaterThan(initialCx)
        })

        test('a tiny stick nudge inside the deadzone should not move the knob',async ({page})=>{
            const knob = page.getByTestId('stick-left-knob')
            const initialCx =await knob.getAttribute('cx')??''

            await page.evaluate(() =>{
                ;(window as unknown as MockWindow).__mockPad.axes[0] =0.03//cause when the deadzone was declared it was below .08
            })

            await page.waitForTimeout(100)
            await expect(knob).toHaveAttribute('cx', initialCx)
        })

    test('clicking in the right stick should highlight it red', async ({page})=> {
        const rightStickKnob = page.getByTestId('stick-right-knob')
        await expect(rightStickKnob).not.toHaveClass(/fill-Red/)
        await page.evaluate(()=>{
            ;(window as unknown as MockWindow).__mockPad.buttons[11].pressed = true   
        })

        await expect(rightStickKnob).toHaveClass(/fill-Red/)
    })

    })

})