import{test, expect, Page} from "@playwright/test"

/*So basically since this is just unit TestTubes, it will have a fake gamepad so that individual tests can like affect/mutate 
the button or part of the controller.*/

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

        ;(window as any).__mockPad =mockPad
        navigator.getGamepads = (() => [mockPad]) as unknown as typeof navigator.getGamepads
    })
}

test.describe('ControllerLayout',() => {
    test.beforeEach(async({page}) =>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('button',{name:/controller/i}).click()
    })

    test('shows "Noo controller detetcted" when nothing is plugged in',async ({page}) => {
        await expect(page.getByText(/no controller detected/i)).toBeVisible()
    })

    test('the status dot gotta be grey when disconnected', async ({page}) => {
        const dot = page.locator('.w-2.h-2.rounded-Fullscreen.bg-Grey\\/40')
        await expect(dot).toBeVisible()
    })

    test('renders the axis labels for both sticks',async ({page}) => {
        await expect(page.getByText('Axis 0')).toBeVisible()
        await expect(page.getByText('Axis 1')).toBeVisible()
    })

    test('renders the select and start labels',async({page})=>{
        await expect(page.getByText('SELECT')).toBeVisible()
        await expect(page.getByText('START')).toBeVisible()
    })

    

})