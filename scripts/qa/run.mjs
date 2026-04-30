import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function desktopDir() {
  // Windows: USERPROFILE\Desktop. Fallback: os.homedir()
  const userProfile = process.env.USERPROFILE || os.homedir();
  return path.join(userProfile, 'Desktop');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

async function safeStep(ctx, name, fn) {
  const { page, outDir, log } = ctx;
  const stepDir = ensureDir(path.join(outDir, name));
  const shotPath = path.join(stepDir, '00.png');
  try {
    log(`STEP ${name}: start`);
    await fn({ ...ctx, stepDir });
    await page.screenshot({ path: shotPath, fullPage: true });
    log(`STEP ${name}: ok (screenshot: ${shotPath})`);
    return { ok: true };
  } catch (e) {
    const errPath = path.join(stepDir, 'ERROR.txt');
    const msg = `${e?.name || 'Error'}: ${e?.message || String(e)}\n${e?.stack || ''}\n`;
    writeFile(errPath, msg);
    try {
      await page.screenshot({ path: path.join(stepDir, 'ERROR.png'), fullPage: true });
    } catch {
      // ignore screenshot failures
    }
    log(`STEP ${name}: FAIL (${e?.message || e})`);
    return { ok: false, error: e };
  }
}

function smallPngBuffer() {
  // 1x1 PNG (opaque green) – enough for upload flows
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAn8B9p4Wq/AAAAAASUVORK5CYII=';
  return Buffer.from(b64, 'base64');
}

function smallJpegBuffer() {
  // 1x1 JPEG (black). Typically passes Laravel 'image' validator reliably.
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAdEAACAgIDAQAAAAAAAAAAAAABAgADBAURBiFB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAZEQACAwEAAAAAAAAAAAAAAAAAAQIREiH/2gAMAwEAAhEDEQA/AJkqK0mXbC2z0mGxwB0tE7y9KcU6r5Jv/2Q==';
  return Buffer.from(b64, 'base64');
}

async function fillFieldByLabel(root, labelText, value) {
  // Form fields are structured as: <div class="field"><label>..</label><input/></div>
  // The label is not associated via "for", so Playwright getByLabel() won't work.
  const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = new RegExp(`^\\s*${escapeRe(labelText)}\\s*$`, 'i');
  const label = root.locator('label').filter({ hasText: exact }).first();
  await label.waitFor({ state: 'visible', timeout: 15000 });
  const field = label.locator('..');
  const input = field.locator('input, textarea').first();
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.fill(value);
}

async function clickTab(page, tabNameRe) {
  const tab = page.locator('[role="tab"]').filter({ hasText: tabNameRe }).first();
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

async function selectFirstPrimeDropdown(page, dialog, labelText) {
  // PrimeVue Dropdown/Select renders a clickable wrapper. In PrimeVue 4 this may be
  // `.p-dropdown` (legacy) or the newer Select with `[role="combobox"]` / `.p-select`.
  const label = dialog.locator('label').filter({ hasText: new RegExp(`^\\s*${labelText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`, 'i') }).first();
  await label.waitFor({ state: 'visible', timeout: 15000 });
  const field = label.locator('..');
  const combo = field.locator('span[role="combobox"]').first();
  if (await combo.count()) {
    await combo.click({ timeout: 15000 });
  } else {
    const trigger = field.locator('.p-select, .p-dropdown, [role="combobox"]').first();
    await trigger.click({ timeout: 15000 });
  }

  // Options are typically rendered in an overlay with role=listbox/option
  const opt =
    page.locator('[role="listbox"] [role="option"]:not([aria-disabled="true"])').first()
      .or(page.locator('.p-dropdown-items .p-dropdown-item:not(.p-disabled)').first())
      .or(page.locator('.p-select-list [role="option"]:not([aria-disabled="true"])').first())
      .or(page.locator('.p-select-option:not(.p-disabled)').first());
  await opt.waitFor({ state: 'visible', timeout: 15000 });
  await opt.click();
  await page.waitForTimeout(300);
}

async function main() {
  const baseURL = process.env.BASE_URL || 'http://localhost:8000';
  const runDir =
    process.env.BUGS_DIR ||
    ensureDir(path.join(desktopDir(), 'bugs', nowStamp()));

  ensureDir(runDir);
  const logPath = path.join(runDir, 'qa.log.txt');

  const logLines = [];
  const log = (line) => {
    const ts = new Date().toISOString();
    const full = `[${ts}] ${line}`;
    logLines.push(full);
    // eslint-disable-next-line no-console
    console.log(full);
    try {
      writeFile(logPath, logLines.join('\n') + '\n');
    } catch {
      // ignore
    }
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Console + network capture
  page.on('pageerror', (err) => log(`PAGEERROR: ${err?.message || err}`));
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      log(`CONSOLE.${type.toUpperCase()}: ${msg.text()}`);
    }
  });
  page.on('requestfailed', (req) => {
    log(`REQFAILED: ${req.method()} ${req.url()} (${req.failure()?.errorText || 'unknown'})`);
  });
  page.on('response', async (res) => {
    const st = res.status();
    if (st >= 400) {
      const url = res.url();
      // Avoid noisy static assets
      if (!url.includes('/build/') && !url.includes('/storage/')) {
        log(`HTTP ${st}: ${res.request().method()} ${url}`);
        if (st === 422 && url.includes('/api/cementerio/sepulturas/') && url.includes('/imagen')) {
          try {
            const body = await res.text();
            log(`HTTP 422 BODY (/imagen): ${body.slice(0, 1000)}`);
          } catch {
            // ignore
          }
        }
        if (st === 422 && url.includes('/api/cementerio/difuntos/') && url.includes('/foto')) {
          try {
            const body = await res.text();
            log(`HTTP 422 BODY (/difunto/foto): ${body.slice(0, 1000)}`);
          } catch {
            // ignore
          }
        }
      }
    }
  });

  const ctx = { page, outDir: runDir, baseURL, log };

  // Fixture file for upload flows
  const tmpTxt = path.join(runDir, 'fixture.txt');
  fs.writeFileSync(tmpTxt, `QA document ${Date.now()}\n`, 'utf8');

  // Create real images via Playwright to satisfy Laravel "image" validator.
  const tmpJpg = path.join(runDir, 'fixture.jpg');
  const tmpPng = path.join(runDir, 'fixture.png');
  {
    const imgPage = await context.newPage();
    await imgPage.setViewportSize({ width: 300, height: 200 });
    await imgPage.setContent('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;font-family:Arial"><div style="padding:20px;border:4px solid #118652">QA IMAGE</div></body></html>');
    await imgPage.screenshot({ path: tmpJpg, type: 'jpeg', quality: 80 });
    await imgPage.screenshot({ path: tmpPng, type: 'png' });
    await imgPage.close();
  }

  await safeStep(ctx, '01_login', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.fill('input[autocomplete="username"]', 'admin');
    await page.fill('input[autocomplete="current-password"]', 'admin2026');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/cementerio', { timeout: 20000 });
    await page.waitForTimeout(500);
  });

  await safeStep(ctx, '02_inicio', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Inicio")', { timeout: 15000 });
    // Open regularizaciones modal (button tile in quick section)
    const regBtn = page.locator('button.quick__tile--reg, button:has-text("Regularizaciones")').first();
    await regBtn.scrollIntoViewIfNeeded();
    await regBtn.click({ timeout: 15000 });
    await page.waitForTimeout(700);
    // Close modal if present
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });

  await safeStep(ctx, '02b_regularizaciones_modal', async ({ page }) => {
    // Open/close modal and capture map
    const regBtn = page.locator('button.quick__tile--reg, button:has-text("Regularizaciones")').first();
    await regBtn.click({ timeout: 15000 });
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  });

  await safeStep(ctx, '02c_busquedas_autabren_sepultura', async ({ page }) => {
    async function openFromTile(tile, query) {
      const input = tile.locator('input').first();
      await input.fill(query);
      await page.waitForTimeout(700);
      const firstItem = tile.locator('.dropdown .dropdown__item').first();
      if (!(await firstItem.count())) return false;

      await firstItem.click();
      await page.waitForTimeout(500);

      // 1) If it auto-opened, a PrimeVue dialog should be visible
      const dialog = page.locator('.p-dialog:visible, [role="dialog"]:visible').first();
      if (await dialog.count()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        return true;
      }

      // 2) Otherwise, use the "Resultado de búsqueda" panel action (Ver sepultura)
      const resultCard = page.locator('.card--result:has-text("Resultado de búsqueda")').first();
      if (await resultCard.count()) {
        const verBtn = resultCard.locator('button:has-text("Ver sepultura")').first();
        if (await verBtn.count()) {
          await verBtn.click();
          await page.waitForTimeout(400);
          const dialog2 = page.locator('.p-dialog:visible, [role="dialog"]:visible').first();
          await dialog2.waitFor({ state: 'visible', timeout: 15000 });
          await page.waitForTimeout(600);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          return true;
        }
      }

      // No sepultura available for that first result
      return false;
    }

    // Use a short query likely to return results in seeded DB
    const tileCon = page.locator('.quick__tile').filter({ hasText: /Buscar concesiones/i }).first();
    await openFromTile(tileCon, 'Fe');

    const tileDif = page.locator('.quick__tile').filter({ hasText: /Buscar difunto/i }).first();
    await openFromTile(tileDif, 'Fe');
  });

  await safeStep(ctx, '03_abrir_detalle_sepultura', async ({ page }) => {
    // Click first sepultura item from the right panel list (if any)
    const first = page.locator('.sep-list .sep-item').first();
    if (await first.count()) {
      await first.click();
      await page.waitForTimeout(800);
    }
  });

  await safeStep(ctx, '04_gestion_tabs', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Iterate through tab headers (PrimeVue)
    const tabs = page.locator('[role="tab"]');
    const n = await tabs.count();
    for (let i = 0; i < n; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(ctx.outDir, `gestion_tab_${String(i + 1).padStart(2, '0')}.png`), fullPage: true });
    }
  });

  await safeStep(ctx, '04b_crud_cementerios_create_delete', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Ensure we are on Cementerios tab
    const cementeriosTab = page.locator('[role="tab"]').filter({ hasText: /Cementerios/i }).first();
    if (await cementeriosTab.count()) {
      await cementeriosTab.click();
      await page.waitForTimeout(500);
    }

    // Auto-accept confirm dialogs (for delete)
    page.once('dialog', async (d) => {
      try {
        await d.accept();
      } catch {
        // ignore
      }
    });

    const rnd = crypto.randomInt(10000, 99999);
    const nombre = `QA Cem ${rnd}`;

    await page.click('button:has-text("Nuevo")', { timeout: 15000 });
    await page.waitForSelector('.p-dialog, [role="dialog"]', { timeout: 15000 });

    const dialog = page.locator('.p-dialog, [role="dialog"]').first();
    await fillFieldByLabel(dialog, 'Nombre', nombre);
    await fillFieldByLabel(dialog, 'Municipio', 'QA Municipio');
    await fillFieldByLabel(dialog, 'Dirección', 'Calle QA 1');
    await fillFieldByLabel(dialog, 'Notas', 'Creado por Playwright QA');

    await dialog.locator('button:has-text("Guardar")').click();
    await page.waitForTimeout(900);

    // Find row and delete it (keeps DB clean)
    const row = page.locator('tr', { hasText: nombre }).first();
    if (await row.count()) {
      await row.locator('button:has-text("Borrar")').click();
      await page.waitForTimeout(900);
    }
  });

  await safeStep(ctx, '04c_crud_zonas_create_delete', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await clickTab(page, /Zonas/i);

    // Accept confirm
    page.once('dialog', async (d) => { try { await d.accept(); } catch {} });

    const rnd = crypto.randomInt(10000, 99999);
    const codigo = `QA-Z${rnd}`;
    const nombre = `Zona QA ${rnd}`;

    await page.click('button:has-text("Nuevo")', { timeout: 15000 });
    await page.waitForSelector('.p-dialog, [role="dialog"]', { timeout: 15000 });
    const dialog = page.locator('.p-dialog, [role="dialog"]').first();

    // Cementerio dropdown (first option)
    await selectFirstPrimeDropdown(page, dialog, 'Cementerio');
    await fillFieldByLabel(dialog, 'Código', codigo);
    await fillFieldByLabel(dialog, 'Nombre', nombre);
    await fillFieldByLabel(dialog, 'Descripción', 'Zona creada por QA');

    await dialog.locator('button:has-text("Guardar")').click();
    await page.waitForTimeout(900);

    // delete
    const row = page.locator('tr', { hasText: nombre }).first();
    if (await row.count()) {
      await row.locator('button:has-text("Borrar")').click();
      await page.waitForTimeout(900);
    }
  });

  await safeStep(ctx, '04d_crud_bloques_create_delete', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await clickTab(page, /Bloques/i);

    page.once('dialog', async (d) => { try { await d.accept(); } catch {} });

    const rnd = crypto.randomInt(10000, 99999);
    const codigo = `QA-B${rnd}`;
    const nombre = `Bloque QA ${rnd}`;

    await page.click('button:has-text("Nuevo")', { timeout: 15000 });
    await page.waitForSelector('.p-dialog, [role="dialog"]', { timeout: 15000 });
    const dialog = page.locator('.p-dialog, [role="dialog"]').first();

    await selectFirstPrimeDropdown(page, dialog, 'Zona');
    await fillFieldByLabel(dialog, 'Código', codigo);
    await fillFieldByLabel(dialog, 'Nombre', nombre);
    await selectFirstPrimeDropdown(page, dialog, 'Tipo');

    // Keep tiny dimensions by clicking minus safely (should clamp at 1)
    const minusBtns = dialog.locator('button:has(.pi-minus)');
    if (await minusBtns.count()) {
      await minusBtns.first().click();
      await page.waitForTimeout(200);
    }

    await dialog.locator('button:has-text("Guardar")').click();
    await page.waitForTimeout(1200);

    const row = page.locator('tr', { hasText: nombre }).first();
    if (await row.count()) {
      await row.locator('button:has-text("Borrar")').click();
      await page.waitForTimeout(1000);
    }
  });

  await safeStep(ctx, '04e_crud_sepulturas_view_edit_uploads', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await clickTab(page, /Sepulturas/i);

    // Open view dialog from first row
    const firstVer = page.locator('button:has-text("Ver")').first();
    if (!(await firstVer.count())) throw new Error('No hay botón "Ver" en sepulturas.');
    await firstVer.click();
    await page.waitForTimeout(1200);

    const dialog = page.locator('.p-dialog, [role="dialog"]').first();

    // Upload photo (difunto titular / imagen sepultura): target ONLY the media actions input
    const fotoInput = dialog.locator('.idv__media .actions input[type="file"][accept*="image"]').first();
    if (await fotoInput.count()) {
      await fotoInput.setInputFiles({
        name: 'qa.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(tmpPng),
      });
      try {
        const meta = await fotoInput.evaluate((el) => {
          const f = el?.files?.[0];
          return f ? { name: f.name, size: f.size, type: f.type } : null;
        });
        ctx.log(`UPLOAD DEBUG (sepultura panel): ${JSON.stringify(meta)}`);
      } catch (e) {
        ctx.log(`UPLOAD DEBUG (sepultura panel): failed to read input meta (${e?.message || e})`);
      }
      await page.waitForTimeout(1200);
    }

    // Upload a document: target ONLY "Documentos adjuntos" section
    const docInput = dialog.locator('.subcard:has-text("Documentos adjuntos") input[type="file"]').first();
    if (await docInput.count()) {
      await docInput.setInputFiles(tmpTxt);
      await page.waitForTimeout(1200);
    }

    // Try editing unit (estado + ubicacion_texto + notas)
    const editBtn = dialog.locator('button:has-text("Editar")').first();
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(400);
      const ubic = dialog.locator('input.ef-input').first();
      if (await ubic.count()) await ubic.fill(`QA ubicacion ${Date.now()}`);
      const notes = dialog.locator('textarea.ef-textarea').first();
      if (await notes.count()) await notes.fill('QA notas internas');
      const save = dialog.locator('button:has-text("Guardar")').first();
      if (await save.count()) {
        await save.click();
        await page.waitForTimeout(1200);
      }
    }

    // Open huérfanos section if exists and attempt link first item (if any)
    const hBtn = dialog.locator('button:has-text("Registros sin asignar")').first();
    if (await hBtn.count()) {
      await hBtn.click();
      await page.waitForTimeout(700);
      const vinc = dialog.locator('button:has-text("Vincular aquí")').first();
      if (await vinc.count()) {
        await vinc.click();
        await page.waitForTimeout(1200);
      }
    }

    // Close dialog
    await dialog.locator('button:has-text("Cerrar")').first().click({ timeout: 15000 });
    await page.waitForTimeout(400);
  });

  await safeStep(ctx, '04f_concesiones_open_detalle', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await clickTab(page, /Concesiones/i);
    const eye = page.locator('button:has(.pi-eye)').first();
    if (await eye.count()) {
      await eye.click();
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  await safeStep(ctx, '04g_terceros_panel_concesiones', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await clickTab(page, /Terceros/i);
    const verBtn = page.locator('button', { hasText: /Ver\s+\d+/i }).first();
    if (await verBtn.count()) {
      await verBtn.click();
      await page.waitForTimeout(1200);
      // open first concesion detail if card exists
      const card = page.locator('.concesion-card').first();
      if (await card.count()) {
        await card.click();
        await page.waitForTimeout(1200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  await safeStep(ctx, '04h_difuntos_search_export', async ({ page }) => {
    await page.goto(`${ctx.baseURL}/cementerio/gestion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await clickTab(page, /Difuntos/i);
    const search = page.locator('input[placeholder*="Buscar nombre"]').first();
    if (await search.count()) {
      await search.fill('test');
      await page.waitForTimeout(600);
      await search.fill('');
      await page.waitForTimeout(300);
    }
    const exp = page.locator('button:has-text("Exportar CSV")').first();
    if (await exp.count()) {
      await exp.click();
      await page.waitForTimeout(400);
    }
  });

  await safeStep(ctx, '05_wizard_nuevo_caso_inventado', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/cementerio/nuevo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2:has-text("Nuevo caso")', { timeout: 15000 });

    const rnd = crypto.randomInt(10000, 99999);
    const dni = `X${rnd}Z`;

    // Step 1 titular (create new)
    const stepBody = page.locator('.card__body:visible').first();
    await fillFieldByLabel(stepBody, 'DNI', dni);
    await fillFieldByLabel(stepBody, 'Nombre', `Test${rnd}`);
    await fillFieldByLabel(stepBody, 'Apellido 1', `Apellido${rnd}`);
    await fillFieldByLabel(stepBody, 'Teléfono', `600${rnd}`);

    await page.click('footer.card__footer button:has-text("Siguiente")');
    await page.waitForTimeout(350);

    // Step 2 difunto
    await page.fill('input[placeholder="Nombre y apellidos"]', `Difunto Test${rnd} Apellido${rnd}`);
    // Attach photo (optional)
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    if (await fileInput.count()) {
      await fileInput.setInputFiles({
        name: 'qa.png',
        mimeType: 'image/png',
        buffer: fs.readFileSync(tmpPng),
      });
      await page.waitForTimeout(400);
    }

    await page.click('footer.card__footer button:has-text("Siguiente")');
    await page.waitForTimeout(600);

    // Step 3 unidad: select first zona, first bloque, then first free cell
    const zonas = page.locator('.zone-segment__btn[role="tab"]');
    if ((await zonas.count()) > 0) {
      await zonas.first().click();
      await page.waitForTimeout(350);
    }

    const bloques = page.locator('.block-card');
    if ((await bloques.count()) > 0) {
      await bloques.first().click();
      await page.waitForTimeout(900);
    }

    const libre = page.locator('button.celda--libre:not([disabled])').first();
    if ((await libre.count()) === 0) {
      throw new Error('No se encontró ninguna sepultura libre para asignar en el primer bloque.');
    }
    await libre.scrollIntoViewIfNeeded();
    await libre.click();
    await page.waitForTimeout(350);

    await page.screenshot({ path: path.join(ctx.outDir, `wizard_unidad_${rnd}.png`), fullPage: true });

    await page.click('footer.card__footer button:has-text("Siguiente")');
    await page.waitForTimeout(500);

    // Step 4 guardar (best-effort: may fail if required fields missing server-side)
    const saveBtn = page.locator('button:has-text("Confirmar y guardar")');
    if (await saveBtn.count()) {
      await saveBtn.click();
      await page.waitForTimeout(1600);
    }
  });

  // Final snapshot
  await page.goto(`${baseURL}/cementerio`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(runDir, 'FINAL.png'), fullPage: true });

  await browser.close();
  log(`DONE. Output: ${runDir}`);
}

await main();

