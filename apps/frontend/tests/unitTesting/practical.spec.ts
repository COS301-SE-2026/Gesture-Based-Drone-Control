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
        await expect (page.getByRole('heading',{name: /mock test/i})).toBeVisible()

    })




})