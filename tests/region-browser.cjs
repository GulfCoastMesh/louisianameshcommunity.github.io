// Optional end-to-end check: requires Playwright and a built site served locally.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.REGION_TEST_URL || 'http://127.0.0.1:8767';
const snapshot = JSON.parse(fs.readFileSync('docs/assets/data/regions.json'));

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/region-codes/');
    await page.waitForSelector('.leaflet-control-zoom');
    await page.locator('fieldset:not([disabled])').waitFor();
    async function locate(lat, lon) {
      await page.locator('[name=latitude]').fill(String(lat));
      await page.locator('[name=longitude]').fill(String(lon));
      await page.getByRole('button', {name:'Find region codes'}).click();
    }
    await locate(29.9511,-90.0715);
    assert.match(await page.locator('[data-status]').innerText(), /Configuration for Gulf Coast Louisiana/);
    const commands = await page.locator('[data-result] > ol code').allTextContents();
    assert.equal(commands.length,2);
    assert.ok(commands[0].startsWith('region def '));
    assert.ok(commands[0].includes('gc-la-msy-mm'));
    assert.ok(commands.every(command => !command.includes('denyf')));
    assert.equal(commands.at(-1),'region save');
    await page.getByRole('button', {name:'Copy region save',exact:true}).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'region save');
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async () => {throw new Error('denied');}}}));
    await page.getByRole('button', {name:'Copy region save',exact:true}).click();
    assert.match(await page.locator('[data-copy-status]').innerText(), /command is selected/);
    await locate(30.2241,-92.0198);
    assert.match(await page.locator('[data-status]').innerText(), /Lafayette/);
    assert.ok(!(await page.locator('[data-result] > ol code').allTextContents()).join(' ').includes('gc-la-msy-mm'));
    await locate(33.7490,-84.3880);
    assert.ok((await page.locator('[data-result] > ol code').allTextContents()).join(' ').includes('us-ga-atl'));
    assert.match(await page.locator('[data-result]').innerText(), /No MeshMapper code is known/);
    await locate(0,0);
    assert.equal(await page.locator('[data-result] button').count(), 0);
    assert.match(await page.locator('[data-status]').innerText(), /No approved regions/);
    // Return to the local view and check a real map click rather than only the form.
    await locate(29.9511,-90.0715);
    await page.waitForTimeout(400);
    const map = page.locator('[data-map]');
    const bounds = await map.boundingBox();
    await map.click({position:{x:bounds.width / 2,y:bounds.height / 2}});
    assert.match(await page.locator('[data-status]').innerText(), /Configuration/);
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await map.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({path:(process.env.REGION_SCREENSHOT_DIR || '/private/tmp') + '/region-map-mobile.png'});
    await page.evaluate(() => document.body.setAttribute('data-md-color-scheme','slate'));
    assert.equal(await page.locator('[data-map] .leaflet-control-zoom').isVisible(), true);
    await page.screenshot({path:(process.env.REGION_SCREENSHOT_DIR || '/private/tmp') + '/region-map-dark.png'});
    assert.deepEqual(errors, []);

    // Simulate overlapping supported regions and ensure no commands appear until a choice.
    const overlap = structuredClone(snapshot);
    overlap.regions.find(r => r.id === 'us-gpt').geometry = overlap.regions.find(r => r.id === 'us-msy').geometry;
    await page.route('**/assets/data/regions.json', route => route.fulfill({json:overlap}));
    await page.reload();
    await page.locator('fieldset:not([disabled])').waitFor();
    await locate(29.9511,-90.0715);
    assert.equal(await page.locator('[data-result] button').count(),0);
    await page.locator('[data-result] select').selectOption('us-gpt');
    assert.ok((await page.locator('[data-result] > ol code').allTextContents()).join(' ').includes('us-ms-gpt-mm'));

    const failed = await context.newPage();
    await failed.route('**/assets/data/regions.json', route => route.fulfill({status:503,body:'unavailable'}));
    await failed.goto(base + '/region-codes/');
    await failed.waitForFunction(() => document.querySelector('[data-status]').textContent.includes('unavailable'));
    assert.equal(await failed.getByRole('button', {name:'Find region codes'}).isDisabled(),true);
    assert.equal(await failed.locator('[data-result] button').count(),0);

    const noMap = await context.newPage();
    await noMap.route('**/leaflet.js', route => route.abort());
    await noMap.goto(base + '/region-codes/');
    await noMap.waitForFunction(() => document.querySelector('[data-map-note]').textContent.includes('could not load'));
    await noMap.locator('[name=latitude]').fill('30.4213');
    await noMap.locator('[name=longitude]').fill('-87.2169');
    await noMap.getByRole('button', {name:'Find region codes'}).click();
    assert.match(await noMap.locator('[data-status]').innerText(), /Pensacola/);
    console.log('Browser checks passed: map click, commands, clipboard/fallback, location changes, overlap, mobile/dark, failed API, failed map library.');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
