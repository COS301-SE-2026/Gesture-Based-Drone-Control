import {test,expect} from '@playwright/test'

test.describe('Authentication' , () => {
    test.beforeEach(async ({page})=>{
        await page.goto('/login')
        await page.waitForLoadState('domcontentloaded')
    })

    test.describe('Login Page', () => {
        test('should render login form with email and the password fields man', async ({page}) => {
            await expect(page.getByText(/sign in to your account/i)).toBeVisible()
            await expect(page.getByLabel(/email address/i)).toBeVisible()
            await expect(page.getByLabel(/password/i)).toBeVisible()
            await expect(page.getByRole('button' , {name: /sign in/i })).toBeVisible()
        })
    })

    test('should show the error when there is nothing in the email thingie',async ({page}) => {
        await page.getByLabel(/password/i).fill('password123')
        await page.getByRole('button' ,  {name: /sign in/i }).click()
        await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('the email cant be invalid ..',async ({page}) => {
        await page.getByLabel(/email address/i).fill('invalidemail')
        await page.getByLabel(/password/i).fill('BabaBlackSheep123')
        await page.getByRole('button' , {name: /sign in/i }).click()
        await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
    })

    test('an error must show if the space is empty',async ({page}) => {
        await page.getByLabel(/email address/i).fill('Coffeeee@faah.com')
        await page.getByRole('button', {name: /sign in/i }).click()
        await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('an error must show if the password is less than 8 characters3',async ({page}) => {
        await page.getByLabel(/email address/i).fill('Coffeeee@faah.com')
        await page.getByLabel(/password/i).fill('lolYeah')
        await page.getByRole('button',{name: /sign in/i }).click()
        await expect(page.getByText(/password needs to be atleast 8 characters/i)).toBeVisible()
    })

    test('the remember me checkbox must be there',async ({page})=> {
        await expect(page.getByLabel(/remember me/i)).toBeVisible()
    })

    test('should show the i forgor password thing as a link', async ({ page}) => {
        await expect(page.getByRole('link' , {name: /forgot password/i })).toBeVisible()
    })

    test('should show the sign up as a link if they already dont have an acc',async ({page}) =>{
        const signupLink = page.getByRole('link' , {name: /sign up/i})
        await expect(signupLink).toBeVisible()
        await signupLink.click()
        await expect(page).toHaveURL(/\/signup/)
    })




})