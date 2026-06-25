import {test,expect, Page} from '@playwright/test'

const fillLoginForm = async (page: Page , email:string = '' , password:string = '') => {
    if (email) await page.getByLabel(/email address/i).fill(email)
    if(password) await page.getByLabel(/password/i).fill(password)
}

const fillSignupForm = async (page: Page , data: any) => {
    if (data.firstName) await page.getByLabel(/first name/i).fill(data.firstName)
    if (data.lastName) await page.getByLabel(/last name/i).fill(data.lastName)
    if (data.email) await page.getByLabel(/email address/i).fill(data.email)
    if (data.dateOfBirth) await page.getByLabel(/date of birth/i).fill(data.dateOfBirth)
    if (data.password) await page.getByLabel(/^password$/i).fill(data.password)
    if (data.confirmPassword) await page.getByLabel(/confirm password/i).fill(data.confirmPassword)
    if (data.agreeToTerms) await page.getByLabel(/i agree to the/i).check()
}

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

    test('should navigate to the signup page',async ({page}) =>{
        await page.getByRole('link' , {name: /sign up/i}).click()
        await expect(page).toHaveURL(/\/signup/)
    })
})


test.describe('Signup Page' , () =>{
    test.beforeEach(async ({page}) => {
        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')
    })

    test('signup must show up with all required fields', async ({page})=> {
        await expect(page.getByText(/create your account/i)).toBeVisible()
        await expect(page.getByLabel(/first name/i)).toBeVisible()
        await expect(page.getByLabel(/last name/i)).toBeVisible()
        await expect(page.getByLabel(/email address/i)).toBeVisible()
        await expect(page.getByLabel(/date of birth/i)).toBeVisible()
        await expect(page.getByLabel(/^password$/i)).toBeVisible()
        await expect(page.getByLabel(/confirm password/i)).toBeVisible()
        await expect(page.getByLabel(/i agree to the/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
    })

    test('must show an error when the first name text space is empty', async ({page}) => {
        await page.getByLabel(/last name/i).fill('Mufasa')
        await page.getByLabel(/email address/i).fill('faaah@gmail.com')
        await page.getByLabel(/date of birth/i).fill('2007-01-04')
        await page.getByLabel(/^password$/i).fill('Faah@123')
        await page.getByLabel(/confirm password/i).fill('Faah@123')
        await page.getByLabel(/i agree to the/i).check()
        await page.getByRole('button', {name: /sign up/i }).click()
        await expect(page.getByText(/first name is required/i)).toBeVisible()
    })

    test ('should show an error is the last name is empty' ,async ({page}) => {
        await fillSignupForm(page, {
            firstName: 'Emily',
            email: 'okay@gmail.com',
            dateOfBirth: '2005-01-23',
            password: 'Erm@123',
            confirmPassword: 'Erm@123',
            agreeToTerms: true,
        })
        await page.getByRole('button' ,{name: /sign up/i }).click()
        await expect(page.getByText(/last name is required/i)).toBeVisible()
    })

    test ('should show an error if the passwords no match' ,async ({page}) => {
        await fillSignupForm(page, {
            firstName: 'chinmayi',
            lastName:'Santhosh',
            dateOfBirth: '2007-01-23',
            password: 'woah2123',
            confirmPassword: 'woah@567',
            agreeToTerms: true,
        })
        await page.getByRole('button' ,{name: /sign up/i }).click()
        await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    })

    test ('should show an error if the terms are not agreed ' ,async ({page}) => {
        await fillSignupForm(page, {
            firstName: 'Chinmayi',
            lastName:'ummmm',
            email: 'ummmm@gmail.com',
            dateOfBirth: '2007-01-23',
            password: 'ummmm@123',
            confirmPassword: 'ummmm@123',
        })
        await page.getByRole('button' ,{name: /sign up/i }).click()
        await expect(page.getByText(/you must agree to continue/i)).toBeVisible()
    })

    test ('should succesfully submit with valid data and redirect to login ' ,async ({page}) => {
        await fillSignupForm(page, {
            firstName: 'Chinmayi',
            lastName:'yeaaaa',
            email: 'yea@gmail.com',
            dateOfBirth: '2009-01-23',
            password: 'yea@123',
            confirmPassword: 'yea@123',
            agreeToTerms: true,

        })
        await page.getByRole('button' ,{name: /sign up/i }).click()
        await expect(page).toHaveURL(/\/login/)
    })

})