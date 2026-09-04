import { test, expect } from '@playwright/test'

test.describe('Help Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/app/help');
        await page.waitForLoadState('domcontentloaded');
    });

    test('shold redner the help page heading', async ({ page }) => {
        await expect(page.getByText(/browse by topic/i)).toBeVisible()
    })

    test('should show all topic cards', async ({ page }) => {
        await expect(page.getByText(/set up & sign in/i)).toBeVisible()
        await expect(page.getByText(/fly with hand gestures/i)).toBeVisible()
        await expect(page.getByText(/telemetry & live status/i)).toBeVisible()
        await expect(page.getByText(/practice in airsim/i)).toBeVisible()
        await expect(page.getByText(/gesture vocabulary/i)).toBeVisible()
        await expect(page.getByText(/troubleshooting/i)).toBeVisible()
    })

    test('should show the help resource buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: /user manual/i})).toBeVisible()
        await expect(page.getByRole('button', { name: /tutorial/i})).toBeVisible()
    })

    test('should show all FAQ items', async ({ page }) => {
        await expect(page.getByText(/the drone won't take off when i gesture - why\?/i)).toBeVisible()
        await expect(page.getByText(/why does the drone just hover on its own\?/i)).toBeVisible()
        await expect(page.getByText(/my hand isn't being tracked properly on screen/i)).toBeVisible()
        await expect(page.getByText(/what happens if the battery gets low mid-flight\?/i)).toBeVisible()
        await expect(page.getByText(/can i try this without an actual drone\?/i)).toBeVisible()
        await expect(page.getByText(/how do i stop the drone immediately\?/i)).toBeVisible()
    })

    test('should show the contact card', async ({ page }) => {
        await expect(page.getByText(/email support/i)).toBeVisible()
        await expect(page.getByText(/codexmerchants@gmail.com/i)).toBeVisible()
    })

    test.describe('Topic Cards', () => {
        test('sjould open manual when click on card', async ({ page, context }) => {
            const newP = context.waitForEvent('page')

            await page.getByText(/set up & sign in/i).click()
            const newPage = await newP
            await expect(newPage).toHaveURL(/.*MANUAL\/#2-set-up-sign-in.*/)
            await newPage.close()
        })

        test('should open manual w correc section for each topic', async ({ page, context }) => {
            const topics = [
                { title: /set up & sign in/i, id: '2-set-up-sign-in' },
                { title: /fly with hand gestures/i, id: '3-fly-the-drone-with-your-hand-uc-1' },
                { title: /telemetry & live status/i, id: '4-watch-what-the-drone-is-doing-uc-2' },
                { title: /practice in airsim/i, id: '5-practise-with-the-airsim-simulator-uc-3' },
                { title: /gesture vocabulary/i, id: '7-the-gesture-vocabulary' },
                { title: /troubleshooting/i, id: '10-troubleshooting' }
            ]

            for (const { title, id } of topics) {
                const newP = context.waitForEvent('page')
                await page.getByText(title).click()
                const newPage = await newP
                await expect(newPage).toHaveURL(new RegExp(`MANUAL/#${id}`))
                await newPage.close()
            }
        })

        test('should open manual click on user manual button', async ({ page, context }) => {
            const newP = context.waitForEvent('page')
            await page.getByRole('button', { name: /user manual/i }).click()
            const newPage = await newP
            await expect(newPage).toHaveURL(/.*MANUAL\/$/)
            await newPage.close()
        })

        test('should navigate to tutorial when clicking tut button', async ({ page }) => {
            await page.getByRole('button', { name: /tutorial/i }).click()
            await expect(page).toHaveURL(/.*tutorial.*/i)
        })
    })

    test.describe('FAQ section', () => {
        test('first faq should be expanded by default', async ({ page }) => {
            const firstans = page.getByText(/the dashboard must say active before takeoff works/i)
            await expect(firstans).toBeVisible()
        })
        test('should expand faq', async ({ page }) => {
            const faqquest = page.getByText(/why does the drone just hover on its own\?/i)
            await faqquest.click()

            const answer = page.getByText(/this is a built-in safety feature, not a bug/i)
            await expect(answer).toBeVisible()
        })

        test('should collaspe FAQ when clicked again', async ({ page }) => {
            const faqquest = page.getByText(/why does the drone just hover on its own\?/i)

            //expand
            await faqquest.click()
            const ans = page.getByText(/this is a built-in safety feature, not a bug/i)
            await expect(ans).toBeVisible()

            //collaspe
            await faqquest.click()
            await page.waitForTimeout(350)
            await expect(ans).not.toBeHidden()
        })

        test('toggle multiple faqs independently', async ({ page }) => {
            const faq2 = page.getByText(/why does the drone just hover on its own\?/i)

            const ans1 = page.getByText(/the dashboard must say active before takeoff works/i)
            await expect(ans1).toBeVisible()

            await faq2.click()
            const ans2 = page.getByText(/this is a built-in safety feature, not a bug/i)
            await expect(ans2).toBeVisible()
            await expect(ans1).toBeVisible()
        })
    })
})
