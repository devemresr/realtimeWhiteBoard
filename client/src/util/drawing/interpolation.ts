import { BasePoint } from '@/types';

const createInterpolator = (config: { maxGap: number }) => {
	const { maxGap } = config;

	// Catmull-Rom spline - mathematically deterministic usable for user drawing and received drawings
	const catmullRom = (
		p0: BasePoint,
		p1: BasePoint,
		p2: BasePoint,
		p3: BasePoint,
		t: number,
	): BasePoint => {
		const t2 = t * t;
		const t3 = t2 * t;

		// Standard Catmull-Rom matrix multiplication
		const x =
			0.5 *
			(2 * p1.x +
				(-p0.x + p2.x) * t +
				(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
				(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

		const y =
			0.5 *
			(2 * p1.y +
				(-p0.y + p2.y) * t +
				(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
				(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

		return {
			x,
			y,
			timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
		};
	};

	const getDistance = (p1: BasePoint, p2: BasePoint): number => {
		return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
	};

	// Main interpolation function
	const interpolate = (points: BasePoint[]): BasePoint[] => {
		if (points.length < 2) return [...points];
		if (points.length === 2) {
			// Simple linear interpolation for 2 points
			return interpolateLinear(points[0], points[1]);
		}

		const result: BasePoint[] = [];

		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];

			const distance = getDistance(p1, p2);
			console.log('distance: ', distance);

			// Math.floor for deterministic step count using ceil might result with different results because of floating point precision differences between devices
			const steps = Math.floor(distance / maxGap);
			console.log('steps count: ', steps);

			// No interpolation needed
			if (steps <= 1) {
				result.push(p1);
			} else {
				// Add interpolated points
				result.push(p1);

				for (let step = 1; step < steps; step++) {
					const t = step / steps;
					const interpolated = catmullRom(p0, p1, p2, p3, t);
					result.push(interpolated);
				}
			}
		}

		// Add the last point
		result.push(points[points.length - 1]);

		return result;
	};

	const interpolateLinear = (p1: BasePoint, p2: BasePoint): BasePoint[] => {
		const distance = getDistance(p1, p2);
		const steps = Math.floor(distance / maxGap);

		if (steps <= 1) return [p1, p2];

		const result = [p1];
		for (let step = 1; step < steps; step++) {
			const t = step / steps;
			result.push({
				x: p1.x + (p2.x - p1.x) * t,
				y: p1.y + (p2.y - p1.y) * t,
				timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
			});
		}
		result.push(p2);

		return result;
	};

	return { interpolate };
};
export default createInterpolator;
