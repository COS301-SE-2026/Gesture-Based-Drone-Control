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


    test.describe('Labels', () => {
        test('xs size label', async ({ page }) => {
            const lebel = page.locator('span:has-text("Xtra small")');
            await expect(lebel).toBeVisible();
            await expect(lebel).toHaveClass(/text-\[11px\]/);
        });
        
        test('sm size label renders', async ({ page }) => {
            const label= page.locator('span:has-text("Small label")');
            await expect(label).toBeVisible();
            await expect(label).toHaveClass(/text-xs/);
        });

        test('labels have correct font styles', async ({ page }) => {
            const label = page.locator('span:has-text("Xtra small")');
            await expect(label).toHaveClass(/font-Inter/);
            await expect(label).toHaveClass(/font-semibold/);
            await expect(label).toHaveClass(/uppercase/);
        });
    });

    test.describe('MetricValue', () => {
        test('renders values with units', async ({ page }) => {
            await expect(page.locator('span:has-text("42")')).toBeVisible();
            await expect(page.locator('span:has-text("%")')).toBeVisible();
            await expect(page.locator('span:has-text("6769")')).toBeVisible();
            await expect(page.locator('span:has-text("ms")')).toBeVisible();
            await expect(page.locator('span:has-text("67")')).toBeVisible();
            await expect(page.locator('span:has-text("mins")')).toBeVisible();
        });

        test('metrics show with diff sizes', async ({ page }) => {
            const smValue = page.locator('span:has-text("42")');
            await expect(smValue).toHaveClass(/text-lg/);
            const mdValue = page.locator('span:has-text("6769")');
            await expect(mdValue).toHaveClass(/text-2xl/);
            const lgValue = page.locator('span:has-text("67")');
            await expect(lgValue).toHaveClass(/text-3xl/);
        });
    });

    test.describe('NavItem', () => {
        test('the nav items in the side bar are rendered', async ({ page }) => {
            await expect(page.locator('button:has-text("Home")')).toBeVisible();
            await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
            await expect(page.locator('button:has-text("Settings")')).toBeVisible();
        });

        test('shows active page with red background', async ({ page }) => {
            const active = page.locator('button.bg-Red:has-text("Home")');
            await expect(active).toBeVisible();
            await expect(active).toHaveClass(/bg-Red/);
            await expect(active).toHaveClass(/text-OffWhite/);
        });

        test('renders nav with icons', async ({ page }) => {
            const item = page.locator('button:has-text("Home")');
            const icon = item.locator('svg');
            await expect(icon).toBeVisible();
        });

        test('active nav card is more visible', async ({ page }) => {
            const active = page.locator('button.bg-Red:has-text("Home")');
            const icon =  active.locator('svg');
            await expect(icon).toHaveAttribute('stroke-width', '2');
        });
    
    });

    // test.describe('StatusDot',()=>{
    //     test('shows if the state is connected or not ', async ({page})=>{
    //         await page.goto('/')
    //         await page.waitForLoadState('domcontentloaded')
    //         await expect(page.getByText(/connected/i)).toBeVisible()

    //     })
    // })



});
