import { chromium } from 'playwright';

const desktop = 'C:/Users/robertopracticas/Desktop';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin2026' }),
    });
    if (!response.ok) {
      throw new Error(`No se pudo iniciar sesión (${response.status})`);
    }
    const data = await response.json();
    localStorage.setItem('conecta2_token', data.token);
  });
  await page.goto('http://localhost:8000/cementerio', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${desktop}/regularizaciones-01-inicio.png`, fullPage: true });

  await page.locator('button:has-text("Regularizaciones")').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${desktop}/regularizaciones-02-modal-difuntos.png`, fullPage: true });

  await page.locator('.p-dialog-content button:has-text("CONCESIONES")').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${desktop}/regularizaciones-03-modal-concesiones.png`, fullPage: true });

  await page.locator('.p-dialog-content label:has-text("Nichos") input').first().uncheck();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${desktop}/regularizaciones-04-mapa-filtros.png`, fullPage: true });

  const selectorCard = page.locator('.p-dialog-content .c2-card').first();
  await selectorCard.screenshot({ path: `${desktop}/regularizaciones-05-selector-zona-bloque.png` });

  const zoneBtn = page.locator('.p-dialog-content .zone-segment__btn').nth(1);
  if (await zoneBtn.count()) {
    await zoneBtn.click();
    await page.waitForTimeout(400);
    await selectorCard.screenshot({ path: `${desktop}/regularizaciones-06-selector-otra-zona.png` });
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
