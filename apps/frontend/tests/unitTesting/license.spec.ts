import{test,expect} from '@playwright/test'

test.describe('License Page', () => {
    test.beforeEach(async({page}) => {
        await page.goto('/#/app/license')
        await page.waitForLoadState('domcontentloaded')
    })

    test('should render the page heading',async ({page}) => {
        await expect(
            page.getByText(/rpl pathway/i)
        ).toBeVisible()
        await expect(
            page.getByRole('heading', {name: /get your remote pilot license/i })
        ).toBeVisible()
    })
    

    test.describe('LicenseOverview card', () => {
        test('should explain what an rpl is' async ({page}) => {
            await expect(
                page.getByText(/what is an rpl\?/i)
            ).toBeVisible()
            await expect(
                page.getByText(/south african civil aviation authority/i)
            ).toBeVisible()
        })

        test('should list the application requirements', async ({page}) => {
            await expect(
                page.getByText(/18 years of age or older/i)
            ).toBeVisible()
            await expect(
                page.getByText(/class3\(or class 5 self declaration\) aviation medical certificate/i)
            ).toBeVisible()
            await expect(
                page.getByText(/restricted radiotelephony certificate/i)
            ).toBeVisible()
            await expect(
                page.getByText(/english proficiency, spoken and written/i)
            ).toBeVisible()
        })

    })

})