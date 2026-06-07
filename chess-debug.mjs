import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
await page.waitForSelector('main svg');
await page.click('nav button:has-text("Analyze")');
await page.waitForTimeout(4000);

// Make a move to trigger engine
const board = await page.$('main svg');
const bx = await board.boundingBox();
const c = bx.width / 8;
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 6.5); // e2
await page.waitForTimeout(300);
await page.mouse.click(bx.x + c * 4.5, bx.y + c * 4.5); // e4
await page.waitForTimeout(3000);

// Inspect the eval bar DOM
const result = await page.evaluate(() => {
  // Find all divs that might be the eval bar container
  const barContainer = document.querySelector('.rounded-full.overflow-hidden');
  if (!barContainer) return { error: 'eval bar not found' };

  const style = window.getComputedStyle(barContainer);
  const children = Array.from(barContainer.children).map(child => {
    const cs = window.getComputedStyle(child);
    const box = child.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      bgColor: cs.backgroundColor,
      inlineStyle: child.getAttribute('style'),
    };
  });

  const box = barContainer.getBoundingClientRect();
  return {
    container: {
      width: box.width,
      height: box.height,
      bgColor: style.backgroundColor,
      classList: barContainer.className,
    },
    children,
  };
});

console.log('Eval bar DOM:', JSON.stringify(result, null, 2));

// Also check what evalScore text shows
const evalText = await page.evaluate(() => {
  const spans = document.querySelectorAll('span');
  for (const s of spans) {
    if (s.textContent?.match(/^[+-]?\d+\.\d+$|^M\d+$|-M\d+$/)) {
      return s.textContent;
    }
  }
  return 'not found';
});
console.log('Eval label text:', evalText);

await browser.close();
