import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SHOTS = '/tmp/chess-screenshots';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

// ---- 1. Load app ----
await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('main svg', { timeout: 20000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/01-puzzle-loaded.png` });
console.log('1. Puzzle tab loaded');

// ---- 2. Click a piece + legal move dots ----
const boardSvg = await page.$('main svg');
const box = await boardSvg.boundingBox();
const cell = box.width / 8;
// Click somewhere in white territory (rank 2 area, e-file ish)
await page.mouse.click(box.x + cell * 4.5, box.y + cell * 5.5);
await page.waitForTimeout(500);
await page.screenshot({ path: `${SHOTS}/02-piece-selected.png` });
console.log('2. Clicked board square');

// ---- 3. Hint level 1 then 2 ----
const hintBtn = await page.$('button:has-text("Hint")');
if (hintBtn) {
  await hintBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/03-hint-level1.png` });
  console.log('3. Hint level 1');
  await hintBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/04-hint-level2.png` });
  console.log('4. Hint level 2');
}

// ---- 4. Play tab ----
await page.click('nav button:has-text("Play")');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOTS}/05-play-setup.png` });
console.log('5. Play - setup screen');

const startBtn = await page.$('button:has-text("Start Game")');
if (startBtn) {
  await startBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/06-play-game.png` });
  console.log('6. Play - game started');
}

// ---- 5. Analyze tab ----
await page.click('nav button:has-text("Analyze")');
await page.waitForTimeout(4000); // wait for Stockfish analysis
await page.screenshot({ path: `${SHOTS}/07-analyze-eval.png` });
console.log('7. Analyze - eval bar');

// Make a move: click e2, then e4
const boardEl = await page.$('main svg');
const bx = await boardEl.boundingBox();
const c = bx.width / 8;
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 6.5); // e2
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/08-analyze-e2-selected.png` });
console.log('8. Analyze - e2 selected (legal dots)');
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 4.5); // e4
await page.waitForTimeout(3000); // wait for eval to update
await page.screenshot({ path: `${SHOTS}/09-analyze-after-e4.png` });
console.log('9. Analyze - after 1.e4, eval updated');

// ---- 6. Settings ----
await page.click('nav button:has-text("Settings")');
await page.waitForTimeout(500);
// Switch to Professional theme
await page.click('button:has-text("Professional")');
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/10-settings-professional.png` });
console.log('10. Settings - Professional theme');

// ---- 7. Puzzle with new theme ----
await page.click('nav button:has-text("Puzzles")');
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/11-puzzle-new-theme.png` });
console.log('11. Puzzle - Professional theme applied');

// ---- 8. Stats ----
await page.click('nav button:has-text("Stats")');
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/12-stats.png` });
console.log('12. Stats');

console.log('\n--- Console errors ---');
errors.forEach(e => console.log(' ERR:', e));
if (errors.length === 0) console.log('  (none)');

await browser.close();
console.log('\nDone. Screenshots:', SHOTS);
