const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('benam_tutorial_done', '1');
    localStorage.removeItem('benam_pin');
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => {
    const tut = document.getElementById('tutorial-overlay');
    if (tut) tut.style.display = 'none';
  });
  await expect.poll(async () => page.evaluate(() => {
    return !!window.BENAM?.services?.triage &&
      !!window.BENAM?.services?.casualty &&
      !!window.BENAM?.services?.['modules.commsSync'];
  })).toBeTruthy();
});

test('triage service sorts by priority', async ({ page }) => {
  const priorities = await page.evaluate(() => {
    const triage = window.BENAM?.services?.triage;
    const input = [
      { priority: 'T3', _addedAt: 3 },
      { priority: 'T1', _addedAt: 2 },
      { priority: 'T2', _addedAt: 1 },
    ];
    return triage.sortByPriority(input).map((c) => c.priority);
  });
  expect(priorities).toEqual(['T1', 'T2', 'T3']);
});

test('casualty service creates defaults', async ({ page }) => {
  const casualty = await page.evaluate(() => {
    const casualtyService = window.BENAM?.services?.casualty;
    return casualtyService.create({ name: 'Unit Test' });
  });
  expect(casualty.name).toBe('Unit Test');
  expect(casualty.priority).toBe('T2');
  expect(Array.isArray(casualty.txList)).toBe(true);
});

test('mesh sync facade exports expected packet format', async ({ page }) => {
  const payload = await page.evaluate(() => {
    return window.BENAM?.services?.['modules.commsSync']?.exportMesh();
  });
  expect(payload.kind).toBe('BENAM_MESH');
  expect(payload.format).toBe('BENAM/2');
  expect(Array.isArray(payload.casualties)).toBe(true);
});
