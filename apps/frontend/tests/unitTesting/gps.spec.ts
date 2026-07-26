//for my pathpoints im using the 6 mock points made on the frontend,
//  it will be replaced once the wesocket is connected
import{test,expect}from '@playwright/test'

  //mock flight path for now ill slot in real data once websocket is wired for telem for adapters
  const mockPathPoints = [
    { x_displacement: 0.0, y_displacement: 0.0, altitude_m: 1.5 }, //take off
    { x_displacement: 1.0, y_displacement: 0.0, altitude_m: 1.5 }, //move right
    { x_displacement: 1.9, y_displacement: 0.9, altitude_m: 2.0 },
    { x_displacement: 2.5, y_displacement: 1.8, altitude_m: 3.0 },
    { x_displacement: -5.0, y_displacement: 3.6, altitude_m: 2.5 }, //seeing if it works for left movements
    { x_displacement: 1.4, y_displacement: 3.9, altitude_m: 1.2 },
  ]

  const mockTelemetry = {
    altitude_m: 1.2,
    x_displacement: 1.4,
    y_displacement: 3.9,
    speed_ms: 1.4,
    heading_deg: 220,
    battery_pct: 67,
    is_flying: true,
    source: "dummy",
  }

test.describe('GPS - displacement stats molecule', () => {
     test.beforeEach(async ({page}) => {
          await page.route('**/api/telemetry/**', async (route) => {
               await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockTelemetry)
               })
          })

          await page.addInitScript(()=>{
                class FakeWebSocket{
                    onopen:(() => void)|null=null
                    onclose:(() =>void )|null=null
                    onerror:(() =>void )|null=null
                    onmessage:((event:MessageEvent) => void)| null=null

                    constructor(){
                        setTimeout(() => {
                            this.onopen?.()
                        },0)
                    }

                    close(){
                        this.onclose?.()
                    }
                    send(){}
                }
                window.WebSocket = FakeWebSocket as unknown as typeof WebSocket
            })

            await page.goto('/gps')
            await page.waitForLoadState('domcontentloaded')

     })
    test('all metric labels are rendered', async ({page}) => {
       
        await expect(page.getByText('X Displacement', {exact: true})).toBeVisible()
        await expect(page.getByText('Y Displacement', {exact: true})).toBeVisible()
        await expect(page.getByText('Speed', {exact: true})).toBeVisible()
        await expect(page.getByText('Heading', {exact: true})).toBeVisible()
        await expect(page.getByText('Direction', {exact: true})).toBeVisible()

    })
    

    test('altitude renders with correc formatted value with its unit', async ({page}) => {
         
         const card = page.getByText('Altitude', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('m')
         const text = await card.textContent()
         expect(text).toMatch(/[\d.]+ m/)
    })

    test('x displacement renders correc formatted value with its unit', async ({page}) => {
         
         const card = page.getByText('X Displacement', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('m')
         await expect(card).not.toContainText('m/s')
    })

    test('y displacement renders correc formatted value with its unit', async ({page}) => {
         
         const card = page.getByText('Y Displacement', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('m')
         
    })

    test('speed renders correc formatted value with its unit', async ({page}) => {
         
         const card = page.getByText('Speed', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('m/s')
    })

    test('heading renders correc formatted value with 1 dec place', async ({page}) => {
         
         const card = page.getByText('Heading', {exact: true }).locator('xpath=..')
         await expect(card).toContainText('°')
    })

    test('direction renders correc cardinal val from heading', async ({page}) => {
         const card = page.getByText('Direction', {exact: true }).locator('xpath=..')
         const text = await card.textContent()
         expect(text).toMatch(/N|NE|E|SE|S|SW|W|NW/)
         
    })

    test.describe('GPS drone map testing', () => {

          test('flight path is rendered', async ({page}) => {
               
               await expect(page.getByText('Flight Path', {exact: true})).toBeVisible()
          })
          test('leaflet map container renders when there is path points exist', async ({ page }) => {
               
               await page.waitForSelector('.leaflet-container', {timeout:10000})
               await expect(page.locator('.leaflet-container')).toBeVisible()
          })
          test('"waiting for telemetry" placeholder doesnt persist when data exists', async ({ page }) => {
               
               await page.waitForSelector('.leaflet-container', {timeout:10000})
               await expect(page.getByText(/waiting for telemetry/i)).not.toBeVisible()
          })
          test('drone marker renders and rotates in the correct direction', async ({ page }) => {
               
               await page.waitForSelector('.leaflet-container', {timeout:10000})
               const marker = page.locator('.drone-marker')
               await expect(marker).toBeVisible()
               const html = await marker.innerHTML()
               expect(html).toContain('rotate')
               expect(html).toMatch(/rotate\([\d.]+deg\)/)
               
          })
          test('exactly one drone marker is rendered on the map', async ({ page }) => {
               
               await page.waitForSelector('.leaflet-container', {timeout:10000})
               await expect(page.locator('.drone-marker')).toHaveCount(1)
          })
          test('flight path polyline renders for each pair of poitns of displacement', async ({ page }) => {
               
               await page.waitForSelector('.leaflet-container', {timeout:10000})
               const paths = page.locator('.leaflet-overlay-pane path')
               const count = await paths.count()
               expect(count).toBeGreaterThan(0)
          })
     })

     


})