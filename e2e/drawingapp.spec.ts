import test, { type Page, type Locator, expect } from '@playwright/test';
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
	const context = await browser.newContext();

	for (let i = 0; i < 3; i++) {
		const newPage = await context.newPage();
		await newPage.goto('http://localhost:3001/');
		await newPage.waitForLoadState('networkidle');
		expect(page.getByText('Connected with socket ID'));
		await mockDrawingSession(newPage);
	}
});
