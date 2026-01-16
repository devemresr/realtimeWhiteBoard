import test, {
	type Page,
	type Locator,
	expect,
	chromium,
} from '@playwright/test';
import { DrawingPatternMocker } from './utility/DrawingPatternMocker';

// Usage function with proper typing
export async function mockDrawingSession(page: Page): Promise<void> {
	const mocker = new DrawingPatternMocker(page, '#drawing-canvas');
	await mocker.init();
	console.log('mockDrawingSession init');
	await mocker.drawStickFigure();
	await mocker.drawSimpleFlower();
}

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:3001/');

	// Wait for the page to be ready (optional but recommended)
	await page.waitForLoadState('networkidle');
	await expect(page.getByTitle('isConnected')).not.toContainText(
		'didnt connect'
	);
});

let index = 0;
const pages: Page[] = [];
test('random drawings', async ({ browser }) => {
	for (let i = 0; i < 1; i++) {
		for (let a = 0; a < 2; a++) {
			const windowPositionsX = a * 400;
			const windowPositionsY = i * 300;
			const windowPosition = `${windowPositionsX},${windowPositionsY}`;
			const browser2 = await chromium.launch({
				headless: false,
				args: [`--window-position=${windowPosition}`, '--window-size=400,300'],
			});
			const context = await browser2.newContext({
				viewport: { width: 400, height: 300 },
			});
			const page = await context.newPage();
			await page.goto('http://localhost:3001/');
			await page.evaluate(() => {
				window.scrollBy(0, 160);
			});
			index++;

			pages.push(page);
		}
	}
	// execute drawing on all pages simultaneously after adding indexes well get simultanous stickman drawings side to side to test concurrent drawing
	await Promise.all(pages.map((p) => mockDrawingSession(p)));

	console.log('All drawings completed');
});

//
test.afterEach(async ({ page }) => {
	await mockDrawingSession(page);
	console.log('index at afterEach: ', index);

	await page.waitForTimeout(100000);
});
