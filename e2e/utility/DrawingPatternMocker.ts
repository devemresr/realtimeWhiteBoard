import test, { type Page, type Locator, expect } from '@playwright/test';

interface Point {
	x: number;
	y: number;
}

interface PetalPosition {
	angle: number;
	distance: number;
}
export class DrawingPatternMocker {
	private page: Page;
	private canvasSelector: string;
	private canvas: Locator | null = null;
	private canvasBounds: any;

	constructor(page: Page, canvasSelector: string = 'canvas') {
		this.page = page;
		this.canvasSelector = canvasSelector;
	}

	async init(): Promise<void> {
		this.canvas = this.page.getByTitle('canvas');
		this.canvasBounds = await this.canvas.boundingBox();
		if (!this.canvasBounds) {
			throw new Error('Canvas not found or not visible');
		}
	}

	// Helper to add human-like imperfections to coordinates
	private addJitter(x: number, y: number, amount: number = 2): Point {
		return {
			x: x + (Math.random() - 0.5) * amount,
			y: y + (Math.random() - 0.5) * amount,
		};
	}

	// Helper to create smooth curved movements
	private async drawCurve(
		startX: number,
		startY: number,
		endX: number,
		endY: number,
		steps: number = 10
	): Promise<void> {
		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			const x = startX + (endX - startX) * progress;
			const y = startY + (endY - startY) * progress;
			const jittered = this.addJitter(x, y);

			await this.page.mouse.move(jittered.x, jittered.y);
		}

		await this.page.mouse.up();
	}

	// Mock drawing a stick figure with typical proportions
	async drawStickFigure(): Promise<void> {
		if (!this.canvasBounds) {
			throw new Error('Canvas not initialized. Call init() first.');
		}

		const centerX = Math.max(
			this.canvasBounds.x + Math.random() * this.canvasBounds.width,
			200
		);
		const topY = this.canvasBounds.y + this.canvasBounds.height / 4;

		// Head (wobbly circle)
		const headRadius = 10;
		const headCenterY = topY + headRadius;

		await this.page.mouse.move(centerX + headRadius, headCenterY);
		await this.page.mouse.down();

		// Draw circle in segments with imperfections
		for (let angle = 0; angle <= 360; angle += 30) {
			const radians = (angle * Math.PI) / 180;
			const x = centerX + Math.cos(radians) * headRadius;
			const y = headCenterY + Math.sin(radians) * headRadius;
			const jittered = this.addJitter(x, y, 2);
			await this.page.mouse.move(jittered.x, jittered.y);
		}
		await this.page.mouse.up();

		// Body (vertical line)
		const bodyTop = topY + headRadius * 2;
		const bodyBottom = bodyTop + 30;
		await this.drawCurve(
			centerX,
			bodyTop,
			centerX + (Math.random() - 0.5) * 10,
			bodyBottom
		);

		// Arms (horizontal line through body)
		const armY = bodyTop + 20;
		const armSpread = 30;
		await this.drawCurve(
			centerX - armSpread,
			armY,
			centerX + armSpread,
			armY + (Math.random() - 0.5) * 10
		);

		// Legs (two lines from bottom of body)
		const legSpread = 20;
		const legLength = 30;

		// Left leg
		await this.drawCurve(
			centerX,
			bodyBottom,
			centerX - legSpread,
			bodyBottom + legLength
		);

		// Right leg
		await this.drawCurve(
			centerX,
			bodyBottom,
			centerX + legSpread,
			bodyBottom + legLength
		);
		console.log('stickman ended for: ', this.page);
	}

	// Mock drawing a flower with typical child-like proportions
	async drawSimpleFlower(): Promise<void> {
		if (!this.canvasBounds) {
			throw new Error('Canvas not initialized. Call init() first.');
		}

		const centerX = this.canvasBounds.x + this.canvasBounds.width / 2;
		const centerY = this.canvasBounds.y + this.canvasBounds.height / 2;

		// Stem (slightly curved line)
		await this.drawCurve(
			centerX,
			centerY + 50,
			centerX + Math.random() * 10 - 5,
			centerY + 150
		);

		// Flower center (small circle)
		const petalRadius = 15;
		await this.page.mouse.move(centerX + petalRadius, centerY);
		await this.page.mouse.down();

		for (let angle = 0; angle <= 360; angle += 45) {
			const radians = (angle * Math.PI) / 180;
			const x = centerX + Math.cos(radians) * petalRadius;
			const y = centerY + Math.sin(radians) * petalRadius;
			await this.page.mouse.move(x, y);
		}
		await this.page.mouse.up();

		// Petals (5 ovals around center)
		const petalPositions: PetalPosition[] = [
			{ angle: 0, distance: 25 },
			{ angle: 72, distance: 25 },
			{ angle: 144, distance: 25 },
			{ angle: 216, distance: 25 },
			{ angle: 288, distance: 25 },
		];

		for (const petal of petalPositions) {
			const radians = (petal.angle * Math.PI) / 180;
			const petalX = centerX + Math.cos(radians) * petal.distance;
			const petalY = centerY + Math.sin(radians) * petal.distance;

			// Draw oval petal (very roughly)
			await this.page.mouse.move(petalX, petalY);
			await this.page.mouse.down();

			const petalWidth = 20;
			const petalHeight = 35;

			// Simple oval approximation
			for (let i = 0; i <= 8; i++) {
				const t = (i / 8) * 2 * Math.PI;
				const x = petalX + (Math.cos(t) * petalWidth) / 2;
				const y = petalY + (Math.sin(t) * petalHeight) / 2;
				const jittered = this.addJitter(x, y, 2);
				await this.page.mouse.move(jittered.x, jittered.y);
			}
			await this.page.mouse.up();
		}
	}

	// Execute a random drawing pattern
	async drawRandomPattern(): Promise<void> {
		const patterns = [
			() => this.drawStickFigure(),
			() => this.drawSimpleFlower(),
		];

		const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
		await randomPattern();
	}
}
