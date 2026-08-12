const { test, expect } = require('@playwright/test');

async function setupApp(page) {
  await page.addInitScript(() => localStorage.setItem('benam_tutorial_done', '1'));
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.evaluate(() => { if(typeof closeTutorial === 'function') closeTutorial(); else { const tut = document.getElementById('tutorial-overlay'); if(tut) tut.style.display='none'; } skipRoleSetup(); });
  await page.waitForTimeout(300);
}

async function startMission(page) {
  await setupApp(page);
  page.on('dialog', dialog => dialog.accept());
  await page.evaluate(() => { _doStartMission(); });
  await page.waitForTimeout(500);
}

test.describe('Sync Master Hub', () => {

  test('Sync Master dashboard opens and shows all tabs', async ({ page }) => {
    await startMission(page);

    // Open Dashboard
    await page.evaluate(() => { openSyncDashboard(); });
    await expect(page.locator('#modal-title')).toContainText('מרכז סנכרון מאוחד');

    // Check Tabs
    await expect(page.locator('text="מצב סנכרון זירה (Tactical Mesh)"')).toBeVisible();
    await expect(page.locator('#modal-body').getByText('📤 שידור', { exact: true })).toBeVisible();
    await expect(page.locator('#modal-body').getByText('📥 קליטה', { exact: true })).toBeVisible();
  });

  test('Tab switching works correctly', async ({ page }) => {
    await startMission(page);
    await page.evaluate(() => { openSyncDashboard('mesh'); });

    // Click Export Tab
    await page.locator('#modal-body').getByText('📤 שידור', { exact: true }).click();
    await expect(page.locator('#modal-body').getByText('מוכן לשידור טקטי', { exact: true })).toBeVisible();

    // Click Scan Tab
    await page.locator('#modal-body').getByText('📥 קליטה', { exact: true }).click();
    await expect(page.locator('#modal-body').getByText('קליטת נתונים (Scanner)', { exact: true })).toBeVisible();
  });

  test('Export scope selector 🌍 vs 👤', async ({ page }) => {
    await startMission(page);
    // Add some casualties first
    await page.evaluate(() => {
      quickAddCas();
      S.casualties[0].name = 'Patient Alpha';
    });

    await page.evaluate(() => { openSyncDashboard('export'); });

    // Toggle to Casualty Scope
    await page.locator('#modal-body').getByText('👤 פצוע ספציפי', { exact: true }).click();
    await expect(page.locator('#modal-body').getByText('מוכן לשידור טקטי', { exact: true })).toBeVisible();
    await expect(page.locator('#modal-body').getByText('Patient Alpha', { exact: true })).toBeVisible();

    // Toggle back to All
    await page.locator('#modal-body').getByText('🌍 הכל (זירה)', { exact: true }).click();
    await expect(page.locator('#modal-body').getByText('מוכן לשידור טקטי', { exact: true })).toBeVisible();
  });

  test('Binary Burst (QR) modal sequence', async ({ page }) => {
    await startMission(page);
    await page.evaluate(async () => {
      quickAddCas();
      await meshExport();
    });

    // Verify Burst UI
    await expect(page.locator('#modal-title')).toContainText('Binary Burst');
    await expect(page.locator('#qr-target-frame')).toBeVisible();
    await expect(page.locator('text=חלק 1/')).toBeVisible();

    // Check Controls
    await expect(page.locator('#qr-auto-btn')).toBeVisible();
    await expect(page.locator('text=הבא ▶')).toBeVisible();
    await expect(page.locator('text=◀ הקודם')).toBeVisible();
  });

  test('Auto-Play speed selector integration', async ({ page }) => {
    await startMission(page);
    await page.evaluate(async () => { await meshExport(); });

    // Change speed to 1s
    await page.click('#spd-1000');
    const speedActive = await page.evaluate(() => _qrAutoSpeed);
    expect(speedActive).toBe(1000);

    // Start AutoPlay
    await page.click('#qr-auto-btn');
    await expect(page.locator('#qr-auto-btn')).toContainText('עצור');
  });

});
