interface StrokePackage {
	strokeId: string;
	packageSequenceNumber: number;
	strokes: Array<{
		x: number;
		y: number;
		timestamp: number;
	}>;
	// [key: string]: any;
	isLastPacket?: boolean;
	strokeSequenceNumber?: number;
}

interface GapDetectionResult {
	strokeId: string;
	isComplete: boolean;
	missingPackages: number[];
	totalPackages: number;
}

export default class StrokePackageGapDetector {
	private parentMap: Map<string, Map<number, StrokePackage>>;
	private completedStrokes: Set<string>;

	constructor() {
		this.parentMap = new Map(); // strokeId -> Map(packageSequenceNumber -> package)
		this.completedStrokes = new Set(); // strokeIds that are complete
	}

	addPackage(packet: StrokePackage): GapDetectionResult | null {
		const {
			strokeId,
			packageSequenceNumber,
			isLastPacket,
			strokeSequenceNumber,
		} = packet;

		// Initialize stroke map if it doesn't exist
		if (!this.parentMap.has(strokeId)) {
			console.log('Adding new strokeId to map:', strokeId);
			this.parentMap.set(strokeId, new Map());
		}

		// Add the packet to the stroke map
		const strokePackageMap = this.parentMap.get(strokeId);
		strokePackageMap?.set(packageSequenceNumber, packet);

		console.log('Packet added:', {
			strokeId,
			packageSequenceNumber,
			isLastPacket,
		});

		// Check for gaps on every packet
		return this.checkStrokeStatus(
			strokeId,
			packageSequenceNumber,
			isLastPacket ?? false,
			strokeSequenceNumber ?? undefined
		);
	}

	private checkStrokeStatus(
		strokeId: string,
		packageSequenceNumber: number,
		isLastPacket: boolean,
		strokeSequenceNumber?: number
	): GapDetectionResult {
		const gaps = this.detectGaps(strokeId, packageSequenceNumber);
		// const strokeGaps = strokeSequenceNumber
		// 	? this.detectStrokeGaps(strokeId, strokeSequenceNumber)
		// 	: null;
		console.log('Checking stroke:', strokeId, 'gaps:', gaps);

		const isComplete = gaps.length === 0 && isLastPacket; // Complete only if no gaps AND it's the last packet

		if (isComplete) {
			this.completedStrokes.add(strokeId);
			console.log(`Stroke ${strokeId} is complete!`);
		} else if (gaps.length > 0) {
			console.log(`Stroke ${strokeId} missing packages:`, gaps);
		} else {
			console.log(
				`Stroke ${strokeId} has no gaps but waiting for more packets`
			);
		}

		return {
			strokeId,
			isComplete,
			missingPackages: gaps,
			totalPackages: packageSequenceNumber,
		};
	}
	detectGaps(strokeId: string, latestPackageNumber: number): number[] {
		const strokePackageMap = this.parentMap.get(strokeId);
		const gaps = [];

		for (let i = 1; i <= latestPackageNumber; i++) {
			if (strokePackageMap && !strokePackageMap.has(i)) {
				gaps.push(i);
			}
		}

		return gaps;
	}
}
