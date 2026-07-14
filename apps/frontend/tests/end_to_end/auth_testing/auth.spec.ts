import{test,expect,Page} from '@playwright/test'

interface SignupFormData {
    firstName?: string
    lastName?: string
    email?: string
    dateOfBirth?: string
    password?: string
    confirmPassword?: string
    agreeToTerms?: boolean
}

const fillSignupForm = async (page: Page , data:SignupFormData) => {
    if (data.firstName) await page. getByLabel(/first name/i).fill(data.firstName)
    if (data.lastName) await page. getByLabel(/last name/i).fill(data.lastName)
    if (data.email) await page. getByLabel(/email address/i).fill(data.email)
    if (data.password) await page. getByLabel(/^password$/i).fill(data.password)
    if (data.confirmPassword) await page. getByLabel(/confirm password/i).fill(data.confirmPassword)
    if (data.agreeToTerms) await page.getByLabel(/i agree to the/i).check()
}


test.describe('Signup then Login flow',() => {
    test('successful signup redirects to the login page', async ({page})=>{
        const uniqueEmail = `e2e+${Date.now()}@example.com`

        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')
        await fillSignupForm(page,{
            firstName:'Sarah',
            lastName:'Jacobs',
            email:uniqueEmail,
            password:'GoodPassword@123',
            confirmPassword:'GoodPassword@123',
            agreeToTerms:true,
        })

        await page.getByRole('button', {name:/sign up/i }).click()
        await expect(page).toHaveURL(/\/login/)
    })

    test('when a new user signs up and logs in, the person can get to the home page', async ({page})=>{
        const uniqueEmail = `e2e+${Date.now()}@example.com`
        const password = "SpectacularPassword@123"

        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')
        await fillSignupForm(page,{
            firstName:'Shreya',
            lastName:'Goshal',
            email :uniqueEmail,
            password,
            confirmPassword:password,
            agreeToTerms:true,
        })

        await page.getByRole('button', {name:/sign up/i}).click()
        await expect(page).toHaveURL(/\/login/)
        await page.getByLabel(/email address/i).fill(uniqueEmail)
        await page.getByLabel(/password/i).fill(password)
        await page.getByRole('button',{name:/sign in/i}).click()

        await expect(page).toHaveURL('/')
    })


    test('should show invalid credentials err when logging in with a wrong passord', async({page})=>{
        const uniqueEmail = `e2e+${Date.now()}@example.com`
        const correctPassword ='GoodPassword@123'

        await page.goto('/signup')
        await page.waitForLoadState('domcontentloaded')
        await fillSignupForm(page,{
            firstName:'Nitara',
            lastName:'Pauly',
            email:uniqueEmail,
            password:correctPassword,
            confirmPassword:correctPassword,
            agreeToTerms:true,
        })

        await page.getByRole('button', {name:/sign up/i}).click()
        await expect(page).toHaveURL(/\/login/)

        await page.getByLabel(/email address/i).fill(uniqueEmail)
        await page.getByLabel(/password/i).fill('WrongPassword@123')
        await page.getByRole('button', {name:/sign in/i}).click()

        await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    })



})

