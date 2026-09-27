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
        test('should explain what an rpl is' ,async ({page}) => {
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

    test.describe('LicenseeOffering card',() => {
        test('should explain what the platform provides' ,async({ page})=>{
            await expect(page.getByText(/what we provide/i)).toBeVisible()
            await expect(page.getByText(/does not issue the license itself/i)).toBeVisible()
        })

        test('should list all three offerings', async ({page}) => {
            await expect(
                page.getByText(/progressive simulator modules/i)
            ).toBeVisible()
            await expect(
                page.getByText(/real gesture control practice/i)
            ).toBeVisible()
            await expect(
                page.getByText(/a mock skills test/i)
            ).toBeVisible()

        })
    })


    test.describe('Get started section ', () => {
        test('should show both training option cards', async ({ page }) => {
            await expect(page.getByText(/theory training/i)).toBeVisible()
            await expect(page.getByText(/practical training/i)).toBeVisible()
        })

        test ('should open the ato theroy site in a new tab ',async ({
            page,
            context,
        }) => {
            const newP = context.waitForEvent('page')
            await  page
                .getByRole('button', {name :/start theory training/i })
                .click()

            const newPage = await newP 
            await expect(newPage).toHaveURL(/drone-x\.co\.za/)
            await newPage.close()
        })

        test('should navigate to the practical training page', async ({
            page,

        }) => {
            await page
            .getByRole('button', {name: /start practical training/i}).click()
            await expect(page).toHaveURL(/.*license\/practical.*/i)
        })
    })

})