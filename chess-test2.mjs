import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SHOTS = '/tmp/chess-screenshots';
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// Go straight to Analyze tab
await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('main svg', { timeout: 20000 });
await page.click('nav button:has-text("Analyze")');
await page.waitForTimeout(4000); // let Stockfish analyze

await page.screenshot({ path: `${SHOTS}/A1-analyze-starting.png` });
console.log('A1: Analyze at start (eval bar should be ~50/50)');

// Make 1.e4
const board = await page.$('main svg');
const bx = await board.boundingBox();
const c = bx.width / 8;
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 6.5); // e2
await page.waitForTimeout(300);
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 4.5); // e4
await page.waitForTimeout(4000);
await page.screenshot({ path: `${SHOTS}/A2-analyze-after-e4.png` });
console.log('A2: After 1.e4 (PV arrow + eval shift)');

console.log('\nErrors:', errors.length ? errors : 'none');
await browser.close();
