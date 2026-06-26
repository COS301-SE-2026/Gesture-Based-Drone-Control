import {test,expect} from '@playwright/test'

test.describe('Atom components', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('h1:has-text("Welcome")');
    });


    // auth panel test
    test.describe('AuthPanel', () => {
        test('renders with title and subtitle', async ({ page }) => {
            await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
            await expect(page.locator('p:has-text("sign in")')).toBeVisible();

        });
    });

    test.describe('Button', () => {
        test('renders all button variants', async ({ page}) => {
            await expect(page.locator('button:has-text("Default")')).toBeVisible();
            await expect(page.locator('button:has-text("Secondary")')).toBeVisible();
            await expect(page.locator('button:has-text("small")')).toBeVisible();
            await expect(page.locator('button:has-text("large")')).toBeVisible();
            await expect(page.locator('button:has-text("Loading")')).toBeVisible();
            await expect(page.locator('button:has-text("Default")')).toBeVisible();
            await expect(page.locator('button:has-text("Icon")')).toBeVisible();
            await expect(page.locator('button:has-text("disabled")')).toBeVisible();
        });

        test('shows loading state when clickity clacked', async ({ page }) => {
            const loadbtn = page.locator('button:has-text("Loading")');
            await loadbtn.click();

            await expect(loadbtn).toHaveClass(/opacity-70/);
            const spinner = loadbtn.locator('.animate-spin');
            await expect(spinner).toBeVisible();
        });

        test('does the button show with an icon', async ({ page }) => {
            const iconbtn = page.locator('button:has-text("Icon")');
            const icon = iconbtn.locator('svg');
            await expect(icon).toBeVisible();
        });

        test('disabled button cannot be clicked', async ({ page }) => {
            const downyButton = page.locator('button:has-text("disabled")');
            await expect(downyButton).toBeDisabled();
        });
    });

    test.describe('Card', () => {
        test('the glass card shows', async ({ page }) => {
            const glassCard = page.locator('p:has-text("Glass card")');
            await expect(glassCard).toBeVisible();
            const card = glassCard.locator('..');
            await expect(card).toHaveClass(/backdrop-blur-md/);
        });

        test('the dark card shows', async ({ page }) => {
            const darkCard = page.locator('p:has-text("dark card")');
            await expect(darkCard).toBeVisible();
            const card = darkCard.locator('..');
            await expect(card).toHaveClass(/bg-OffBlack/);
        });

        test('the clickable card shows', async ({ page }) => {
            const clickCard = page.locator('p:has-text("clickable card")');
            await expect(clickCard).toBeVisible();
            const card = clickCard.locator('..');
            await expect(card).toHaveClass(/cursor-pointer/);
        });
    });

    test.describe('FormSection', () => {
        test('renders all form sections with labels', async ({ page }) => {
            await expect(page.locator('label:has-text("Email")')).toBeVisible();
            await expect(page.locator('label:has-text("Password")')).toBeVisible();
            await expect(page.locator('label:has-text("Error")')).toBeVisible();
        });

        test('handles email input changes', async ({ page }) => {
            const input = page.locator('input[placeholder="enter email"]');
            await input.fill('test@eg.com');
            await expect(input).toHaveValue('test@eg.com');
        });

        test('handles password input changes', async ({ page }) => {
            const input = page.locator('input[placeholder="enter password"]');
            await input.fill('testpassword123');
            await expect(input).toHaveValue('testpassword123');
        });

        test('shows error state w msg', async ({ page }) => {
            const err = page.locator('input[placeholder="error field"]');
            await expect(err).toHaveClass(/border-DarkRed/);
            const errMsg = page.locator('p.text-sm.text-Red:has-text("field required")');
            await expect(errMsg).toBeVisible();
        });
    });


    test.describe('Labels', ()=>{
    // test('stats table rendering on the dashboard page', async({page})=>{
    //     await page.goto('/')
    //     await page.waitForLoadState('domcontentloaded')
    //     await expect(page.getByText(/stats/i)).toBeVisible()// the /..../i thing like checks for differnt capitalizations
    // })

    test('The CommandHistory label shows up on the gesture page',async({page})=>{
        await page.goto('/gestures')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText(/command history/i)).toBeVisible()
    })

})

test.describe('NavItem', ()=>{
    test('the nav items in the side bar are rendered', async({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        //await expect(page.getByText(/dashboard/i)).toBeVisible()
        const sidebar = page.getByRole('navigation')
        await expect(sidebar.getByText(/analytics/i)).toBeVisible()
        await expect(sidebar.getByText(/gestures/i)).toBeVisible()

    })

    test('when the analytics button in the navbar is clicked, it navigates to the analytics page', async({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('navigation').getByRole('button',{name:/analytics/i }).click()
        await expect(page).toHaveURL(/analytics/)
    })

    test('when the gestures item is clicked it goes into the gestures page', async({page})=>{
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        await page.getByRole('navigation').getByRole('button',{name:/gestures/i }).click()
        await expect(page).toHaveURL(/gestures/)
    })


    // test.describe('Button',()=>{
    //     test('does it show the droneSim and the Hardware mode buttons on the dashboard??',async({page})=>{
    //         await page.goto('/')
    //         await page.waitForLoadState('domcontentloaded')
    //         await expect(page.getByRole('button',{name: /dronesim/i})).toBeVisible()
    //         await expect(page.getByRole('button',{name: /hardware/i})).toBeVisible()
    //     })

    //     test(' Hardware Button clickable??', async({page})=>{
    //         await page.goto('/')
    //         await page.waitForLoadState('domcontentloaded')
    //         const hardwareBtn = page.getByRole('button',{name:/hardware/i })
    //         await expect(hardwareBtn).toBeEnabled()
    //         await hardwareBtn.click()
    //         await expect(hardwareBtn).toBeVisible()//so like it shouldnt disappear like after we click it...
    //     })

    //}
//)

    
        test('the state must actually chnage when its clicked on',async ({page})=>{
            await page.goto('/')
            await page.waitForLoadState('domcontentloaded')
            const toggle=page.locator('input[type="checkbox"]').first()
            const initialState = await toggle.isChecked()
            const toggleLabel= page.locator('label').filter({
                has: page.locator('input[type="checkbox"]')
            }).first()
            await toggleLabel.click({force:true})
            const newState = await toggle.isChecked()
            expect(newState).toBe(!initialState)
        })
    })

    // test.describe('StatusDot',()=>{
    //     test('shows if the state is connected or not ', async ({page})=>{
    //         await page.goto('/')
    //         await page.waitForLoadState('domcontentloaded')
    //         await expect(page.getByText(/connected/i)).toBeVisible()

    //     })
    // })



});
