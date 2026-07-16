//for my pathpoints im using the 6 mock points made on the frontend,
//  it will be replaced once the wesocket is connected
import{test,expect}from '@playwright/test'

test.describe('GPS - displacement stats molecule', () => {
    test('all metric labels are rendered', async ({page}) => {
        await page.goto('/gps')
        await page.waitForLoadState('domcontentloaded')
        await expect(page.getByText('Altitude', {exact: true})).toBeVisible()
        await expect(page.getByText('X Displacement', {exact: true})).toBeVisible()
        await expect(page.getByText('Y Displacement', {exact: true})).toBeVisible()
        await expect(page.getByText('Speed', {exact: true})).toBeVisible()
        await expect(page.getByText('Heading', {exact: true})).toBeVisible()
        await expect(page.getByText('Direction', {exact: true})).toBeVisible()

    })

    test('altitude renders with correc formatted value with its unit', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
         const card = page.getByText('Altitude', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('1.20')
         await expect(card).toContainText('m')
    })

    test('x displacement renders correc formatted value with its unit', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
         const card = page.getByText('X Displacement', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('1.40')
         await expect(card).not.toContainText('m/s')
    })

    test('y displacement renders correc formatted value with its unit', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
         const card = page.getByText('Y Displacement', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('3.90')
         
    })

    test('speed renders correc formatted value with its unit', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
         const card = page.getByText('Speed', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('1.40')
         await expect(card).toContainText('m/s')
    })

    test('heading renders correc formatted value with 1 dec place', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
         const card = page.getByText('Heading', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('220.0')
         await expect(card).toContainText('°')
    })

    test('direction renders correc cardinal val from heading', async ({page}) => {
         await page.goto('/gps')
         await page.waitForLoadState('domcontentloaded')
        //  220 -> Math.round(220/45) % 8 = 5 therfore SW
         const card = page.getByText('Direction', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('SW')
         
    })

    test.describe('GPS drone map testing', () => {

          test('flight path is rendered', async ({page}) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               await expect(page.getByText('Flight Path', {exact: true})).toBeVisible()
          })
          test('leaflet map container renders when there is path points exist', async ({ page }) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               await expect(page.locator('.leaflet-container')).toBeVisible()
          })
          test('"waiting for telemetry" placeholder doesnt persist when data exists', async ({ page }) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               await expect(page.getByText(/waiting for telemetry/i)).not.toBeVisible()
          })
          test('drone marker renders and rotates in the correct direction', async ({ page }) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               const marker = page.locator('.drone-marker div')
               await expect(marker).toBeVisible()
               const style = await marker.getAttribute('style')
               expect(style).toContain('rotate(220deg)')
          })
          test('exactly one drone marker is rendered on the map', async ({ page }) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               await expect(page.locator('.drone-marker')).toHaveCount(1)
          })
          test('flight path polyline renders for each pair of poitns of displacement', async ({ page }) => {
               await page.goto('/gps')
               await page.waitForLoadState('domcontentloaded')
               //6 mock pts for now, 5 coneccting segment
               const paths = page.locator('.leaflet-overlay-pane path')
               await expect(paths).toHaveCount(5)
          })
     })

     test.describe('GPS - empty state', () => {
          test('shows the waiting message when no path points are available', () => {
               //req compoent to receive an empty pathpoints
               //array (eg before websocket delivers the 1st telemetry frame)
               //if gps mock state is swapped for live data, mock endpoint
               //TODO
               test.skip(true, 'Enable once GPS page reads live/mockable telemetry instead of hardcoded mock state')
          })
     })


})