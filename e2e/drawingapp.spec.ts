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

	await mocker.drawStickFigure();
	await mocker.drawSimpleFlower();
	await page.waitForTimeout(3000);
}

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:3001/');

	// Wait for the page to be ready (optional but recommended)
	await page.waitForLoadState('networkidle');
});

test('random drawings', async ({ page, browser }) => {
	for (let i = 0; i < 3; i++) {
		for (let a = 0; a < 4; a++) {
			const windowPositionsY = i * 300;
			const windowPositionsX = a * 300;
			const windowPosition = `${windowPositionsX},${windowPositionsY}`;
			const browser2 = await chromium.launch({
				headless: false,
				args: [`--window-position=${windowPosition}`, '--window-size=300,300'],
			});
			const context = await browser2.newContext({
				viewport: { width: 400, height: 300 },
			});
			const page = await context.newPage();
			await page.goto('http://localhost:3001/');
			await page.evaluate(() => {
				window.scrollBy(0, 160);
			});
			if (i == 2 && a === 3) {
				await page.waitForTimeout(10000000); // Wait 10 seconds
			}
		}

		// await context.close();
	}
});
