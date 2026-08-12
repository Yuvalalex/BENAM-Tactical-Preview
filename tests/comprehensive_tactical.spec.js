const { test, expect } = require('@playwright/test');

/**
 * COMPREHENSIVE TACTICAL SUITE - BENAM 1.1 (Industrial Grade)
 * Validates the entire mission lifecycle from Prep to AAR.
 */

test.describe('End-to-End Mission Validation', () => {

  async function startMission(page) {
    await page.addInitScript(() => localStorage.setItem('benam_tutorial_done', '1'));
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    // Skip Role & Start
    await page.evaluate(() => { if(typeof closeTutorial === 'function') closeTutorial(); else { const tut = document.getElementById('tutorial-overlay'); if(tut) tut.style.display='none'; } skipRoleSetup(); });
    page.on('dialog', dialog => dialog.accept());
    await page.evaluate(() => { _doStartMission(); });
    await page.waitForTimeout(500);
    await expect(page.locator('#sc-war')).toBeVisible();
  }

  test('01. Core Launch & Stability', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('#sc-role')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('02. Preparation & Readiness Hub', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(() => { if(typeof closeTutorial === 'function') closeTutorial(); else { const tut = document.getElementById('tutorial-overlay'); if(tut) tut.style.display='none'; } skipRoleSetup(); });
    await page.evaluate(() => setPrepTab('evac'));
    await expect(page.locator('#sc-prep')).toBeVisible();

    // Verify Mission Readiness Dashboard
    await expect(page.locator('text=מוכנות ליציאה')).toBeVisible();
    await expect(page.getByText('סדר פינוי + כוח מפנה', { exact: true })).toBeAttached();
  });

  test('03. War Room Viewport Dynamics', async ({ page }) => {
    await startMission(page);
    await page.evaluate(() => { quickAddCas(); });

    const views = ['matrix', 'triage', 'march', 'blood', 'cards'];
    for (const v of views) {
      await page.evaluate(m => setWarView(m), v);
      await page.waitForTimeout(100);
      // Verify active view indicator
      const isActive = await page.evaluate(m => {
        const view = document.getElementById(`wr-view-${m}`);
        return Boolean(view && getComputedStyle(view).display !== 'none');
      }, v);
      expect(isActive).toBeTruthy();
    }
  });

  test('04. High-Fidelity Casualty Management (Form 101)', async ({ page }) => {
    await startMission(page);
    await page.evaluate(() => { quickAddCas(); });
    const cId = await page.evaluate(() => S.casualties[0].id);

    // Jump into Patient Drawer
    await page.evaluate(id => jumpToCas(id), cId);
    await expect(page.locator('#cas-drawer.open')).toBeAttached();

    // Edit Form 101 Fields
    await page.locator('#cas-drawer button').filter({ hasText: 'T1' }).first().click(); // Priority change

    // Check Intervention logic
    await page.locator('#cas-drawer button').filter({ hasText: '🩹 TQ' }).first().click();
    const interventions = await page.evaluate(id => S.casualties.find(c => c.id === id).txList.length, cId);
    expect(interventions).toBeGreaterThan(0);
  });

  test('05. Sync Master - Tactical Data Link', async ({ page }) => {
    await startMission(page);

    // Hub Accessibility
    await page.evaluate(() => { openSyncDashboard(); });
    await expect(page.locator('#modal-title')).toContainText('מרכז סנכרון מאוחד');

    // Binary Burst Portal Verification
    await page.locator('#modal-body').getByText('📤 שידור', { exact: true }).click();
    await page.locator('#modal-body').getByText('צור רצף שידור (BURST)', { exact: true }).click();
    await expect(page.locator('#qr-target-frame')).toBeVisible();
    await expect(page.locator('text=הבא ▶')).toBeVisible();
  });

  test('06. After Action Review (AAR) & Log Integrity', async ({ page }) => {
    await startMission(page);
    await page.evaluate(() => {
      quickAddCas();
      addTL(S.casualties[0].id, S.casualties[0].name, 'Test Log Event', 'red');
    });

    // Validate Log Entry
    const logs = await page.evaluate(() => S.timeline.length);
    expect(logs).toBeGreaterThan(0);

    // Generate Report
    await page.evaluate(() => { genReport(); });
    await expect(page.locator('#report-txt')).toContainText('MEDEVAC');
  });

  test('07. Global Utilities (PIN & System)', async ({ page }) => {
    await page.goto('/');
    // Night Mode Toggle
    const isDarkBefore = await page.evaluate(() => document.body.classList.contains('night-vision'));
    await page.evaluate(() => { toggleNightMode(); });
    const isDarkAfter = await page.evaluate(() => document.body.classList.contains('night-vision'));
    expect(isDarkBefore).not.toEqual(isDarkAfter);

    // PIN Lock Screen
    await page.evaluate(() => { if(typeof togglePinLock === 'function') togglePinLock(true); });
    // Verify Lock Overlay
    await expect(page.locator('#pin-lock')).toBeVisible();
  });

});
