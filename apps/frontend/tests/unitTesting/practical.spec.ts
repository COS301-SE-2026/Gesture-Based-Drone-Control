import {test,expect} from '@playwright/test'

test.describe('Practical page ' , () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/#/app/license/practical')
        await page.waitForLoadState('domcontentloaded')
    })


    test('should render the page heading ', async ({ page}) => {
        await expect(
            page.getByText(/practical pathway/i)
        ).toBeVisible()
        await expect (
            page.getByRole('heading', {name: /skills test prep/i})
        ).toBeVisible()
    })


    test('should list every module in the roadmap' , async({page}) => {
        await expect (page.getByText(/basic maneuvers/i)).toBeVisible()
        await expect (page.getByText(/obstacle blocks/i)).toBeVisible()
        await expect (page.getByRole('heading',{name: /figure-8/i})).toBeVisible()
        await expect (page.getByText(/mock test/i)).toBeVisible()
    })

    test.describe('module locking',() => {
        test('the first module should be available', async ({page}) => {
            const startButton = page.getByRole('button', {name: /start module/i}).first()
            await expect(startButton).toBeVisible()
            await expect(startButton).toBeEnabled()
        })

        test ('modules after the first should start locked ' , async ({page}) => {
            const lockedButtons = page.getByRole('button', {name: /^locked$/i })
            await expect(lockedButtons).toHaveCount(3)
            for (const btn of await lockedButtons.all()) {
                await expect(btn).toBeDisabled()
            }
        })


        test('clicking a locked module should not open the exercise modal' , async ({ page}) => {
            await page.getByRole('button', { name: /^locked$/i }).first().click({ force: true})
            await expect (
                page.getByRole('dialog')
            ).not.toBeVisible()
        })
    })


    test.describe('exercise modal' , () => {
        test('should open with the correct module details' , async ({page}) => {
            await page.getByRole('button', { name: /start module/i }).first().click()

            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect(
                dialog.getByRole('heading', {name: /basic maneuvers/i})
            ).toBeVisible()
            await expect(
                dialog.getByText(/beginner/i)
            ).toBeVisible()
            await expect(
                dialog.getByText(/fly up, down, left and right/i)
            ).toBeVisible()
        })

        test('should show the gesture camera simulation panes', async ({page}) =>{
            await page
                .getByRole('button', {name : /start module/i})
                .first()
                .click()

                await expect(page.getByText(/gesture camera/i)).toBeVisible()
                await expect(page.locator('[data-testid="gesture-camera-feed"]')).toBeVisible()
                await expect(page.getByText(/^simulation$/i)).toBeVisible()
                
        })

        test ('should close via the close button', async ({ page}) => {
            await page 
                .getByRole('button', {name:/start module/i})
                .first()
                .click()

            await expect(page.getByRole('dialog')).toBeVisible()
            await page.getByRole('button', {name: /close/i}).click()
            await expect(page.getByRole('dialog')).not.toBeVisible()
        })

         test ('should close via the escape btn', async ({ page}) => {
            await page 
                .getByRole('button', {name:/start module/i})
                .first()
                .click()

            await expect(page.getByRole('dialog')).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(page.getByRole('dialog')).not.toBeVisible()
        })

         test ('should close if you click somehwere in the background', async ({ page}) => {
            await page 
                .getByRole('button', {name:/start module/i})
                .first()
                .click()

            await expect(page.getByRole('dialog')).toBeVisible()


            await page.mouse.click(10,10)
            await expect(page.getByRole('dialog')).not.toBeVisible()
        })


    })


})