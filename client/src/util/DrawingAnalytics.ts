import sizeof from 'object-sizeof';
import AnalyticsLocalStorageManager from './AnalyticsLocalStorageManager';
interface DrawingEvent {
	eventId: string;
	timestamp: number;
	eventType:
		| 'stroke_start'
		| 'stroke_continue'
		| 'stroke_end'
		| 'canvas_clear'
		| 'undo'
		| 'redo';
	strokeId?: string;
	coordinates?: { x: number; y: number };
	pressure?: number;
	tool?: string;
	color?: string;
	brushSize?: number;
	userId?: string;
	sessionId: string;
}

interface NetworkMetrics {
	eventId: string;
	timestamp: number;
	rtt: number;
	acknowledged: boolean;
	retryCount: number;
	payloadSize: number;
	connectionQuality: 'excellent' | 'good' | 'fair' | 'decent' | 'poor';
}

interface PerformanceMetrics {
	timestamp: number;
	fps: number;
	memoryUsage: number;
	canvasRenderTime: number;
	eventProcessingTime: number;
	queuedEvents: number;
}

interface UserBehaviorMetrics {
	sessionId: string;
	userId?: string;
	sessionStart: number;
	totalStrokes: number;
	averageStrokeLength: number;
	mostUsedTool: string;
	mostUsedColor: string;
	totalDrawingTime: number;
	idleTime: number;
	undoCount: number;
	redoCount: number;
	canvasClearCount: number;
}

class DrawingAnalytics {
	private sessionId: string;
	private storage: AnalyticsLocalStorageManager;
	private userId?: string;
	private events: DrawingEvent[] = [];
	private syncTimer: NodeJS.Timeout;
	private networkMetrics: NetworkMetrics[] = [];
	private performanceMetrics: PerformanceMetrics[] = [];
	private userBehavior: UserBehaviorMetrics;
	private lastActivity: number = Date.now();
	private currentStrokeStart?: number;
	private frameCount = 0;
	private lastFPSCheck = performance.now();
	private eventQueue: any[] = [];

	constructor(userId?: string, intervalMs: number = 30000) {
		this.sessionId = this.generateId();
		this.userId = userId;
		this.userBehavior = this.initializeUserBehavior();
		this.storage = new AnalyticsLocalStorageManager();
		this.startPerformanceMonitoring();
		this.startPeriodicSync(intervalMs);
		// Load existing data from localStorage
		this.loadFromStorage();

		// Sync on page unload
		window.addEventListener('beforeunload', () => {
			this.syncNow();
		});
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private loadFromStorage(): void {
		// Load existing data if any (useful for page refreshes)
		const existingBehavior = this.storage.getUserBehavior();
		if (existingBehavior && existingBehavior.sessionId === this.sessionId) {
			this.userBehavior = existingBehavior;
		}
	}

	private initializeUserBehavior(): UserBehaviorMetrics {
		return {
			sessionId: this.sessionId,
			userId: this.userId,
			sessionStart: Date.now(),
			totalStrokes: 0,
			averageStrokeLength: 0,
			mostUsedTool: '',
			mostUsedColor: '',
			totalDrawingTime: 0,
			idleTime: 0,
			undoCount: 0,
			redoCount: 0,
			canvasClearCount: 0,
		};
	}

	private startPeriodicSync(intervalMs: number): void {
		console.log('startPeriodicSync');

		this.syncTimer = setInterval(async () => {
			await this.syncNow();
		}, intervalMs);
	}

	// Manual sync trigger
	async syncNow(): Promise<boolean> {
		console.log('Starting analytics sync...');

		// Queue current session data
		this.storage.queueForSync(this.sessionId);

		// Try to sync all queued data
		const syncQueue = this.storage.getSyncQueue();
		let syncedCount = 0;

		// todo send to the backend
		// for (const payload of syncQueue) {
		// if (success) {
		// 	this.storage.clearSyncedData(payload.timestamp);
		// 	syncedCount++;
		// } else {
		// 	break; // Stop on first failure to maintain order
		// }
		// }

		if (syncedCount > 0) {
			console.log(`Synced ${syncedCount} analytics payloads`);
			// Clear local data after successful sync
			this.storage.clearLocalData();
			return true;
		}

		return false;
	}

	// Enhanced drawing event logging with comprehensive data
	logDrawingEvent(
		eventType: DrawingEvent['eventType'],
		data: {
			coordinates?: { x: number; y: number };
			pressure?: number;
			tool?: string;
			color?: string;
			brushSize?: number;
			strokeId?: string;
		} = {}
	): string {
		const eventId = this.generateId();
		const timestamp = Date.now();

		const event: DrawingEvent = {
			eventId,
			timestamp,
			eventType,
			sessionId: this.sessionId,
			userId: this.userId,
			...data,
		};

		this.events.push(event);
		this.updateUserBehavior(event);
		this.lastActivity = timestamp;

		// Log to console with structured format
		// console.group(`Drawing Event: ${eventType}`);
		// console.log('Event ID:', eventId);
		// console.log('Timestamp:', new Date(timestamp).toISOString());
		// console.log('Data:', data);
		console.groupEnd();
		this.storage.appendData(this.storage.STORAGE_KEYS.EVENTS, event);

		return eventId;
	}

	// Enhanced network logging with quality assessment
	logNetworkEvent(
		eventId: string,
		startTime: number,
		acknowledged: boolean,
		payloadSize: number,
		retryCount: number = 0
	): void {
		const rtt = performance.now() - startTime;
		const connectionQuality = this.assessConnectionQuality(rtt);

		const networkMetric: NetworkMetrics = {
			eventId,
			timestamp: Date.now(),
			rtt,
			acknowledged,
			retryCount,
			payloadSize,
			connectionQuality,
		};

		this.networkMetrics.push(networkMetric);

		// console.group(`Network Event`);
		// console.log('Event ID:', eventId);
		// console.log('RTT:', `${rtt.toFixed(2)}ms`);
		// console.log('Quality:', connectionQuality);
		// console.log('Payload Size:', `${payloadSize} bytes`);
		// console.log('Acknowledged:', acknowledged);
		this.storage.appendData(this.storage.STORAGE_KEYS.NETWORK, networkMetric);
		if (retryCount > 0) console.warn('Retry Count:', retryCount);
		console.groupEnd();
	}

	private assessConnectionQuality(
		rtt: number
	): NetworkMetrics['connectionQuality'] {
		if (rtt < 50) return 'excellent';
		if (rtt < 100) return 'good';
		if (rtt < 200) return 'fair';
		if (rtt < 500) return 'decent';
		return 'poor';
	}

	// Performance monitoring
	private startPerformanceMonitoring(): void {
		if (
			typeof window === 'undefined' ||
			typeof requestAnimationFrame === 'undefined'
		) {
			console.warn('Performance monitoring not available in this environment');
			return;
		}
		const monitor = () => {
			const now = performance.now();
			const deltaTime = now - this.lastFPSCheck;

			if (deltaTime >= 1000) {
				// if its been a second
				const fps = (this.frameCount * 1000) / deltaTime;
				const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

				const perfMetric: PerformanceMetrics = {
					timestamp: Date.now(),
					fps: Math.round(fps),
					memoryUsage,
					canvasRenderTime: 0, // You'll need to measure this in your render loop
					eventProcessingTime: 0, // Measure in your event handlers
					queuedEvents: this.eventQueue.length,
				};

				this.performanceMetrics.push(perfMetric);
				this.frameCount = 0;
				this.lastFPSCheck = now;
				this.storage.appendData(
					this.storage.STORAGE_KEYS.PERFORMANCE,
					this.performanceMetrics
				);

				// Log performance warnings
				if (fps < 30) {
					console.warn(`Low FPS detected: ${fps.toFixed(1)}`);
				}
				if (this.eventQueue.length > 10) {
					console.warn(`Event queue backlog: ${this.eventQueue.length} events`);
				}
			}

			this.frameCount++;
			requestAnimationFrame(monitor);
		};

		requestAnimationFrame(monitor);
	}

	// Update user behavior metrics
	private updateUserBehavior(event: DrawingEvent): void {
		switch (event.eventType) {
			case 'stroke_start':
				this.userBehavior.totalStrokes++;
				this.currentStrokeStart = event.timestamp;
				break;
			case 'stroke_end':
				if (this.currentStrokeStart) {
					const strokeDuration = event.timestamp - this.currentStrokeStart;
					this.userBehavior.totalDrawingTime += strokeDuration;
				}
				break;
			case 'undo':
				this.userBehavior.undoCount++;
				break;
			case 'redo':
				this.userBehavior.redoCount++;
				break;
			case 'canvas_clear':
				this.userBehavior.canvasClearCount++;
				break;
		}
		this.storage.appendData(this.storage.STORAGE_KEYS.USER_BEHAVIOR, event);
	}

	// Enhanced socket emission with comprehensive logging
	emitWithLogging(
		socket: any,
		eventName: string,
		data: any,
		options: {
			timeout?: number;
			retryCount?: number;
			priority?: 'high' | 'normal' | 'low';
		} = {}
	): Promise<boolean> {
		return new Promise((resolve) => {
			const startTime = performance.now();
			const eventId = this.logDrawingEvent('stroke_continue', data);
			const payloadSize = sizeof(data);
			let retryCount = 0;
			const maxRetries = options.retryCount || 3;

			const attempt = () => {
				socket.emit(eventName, data, (ack: boolean) => {
					this.logNetworkEvent(
						eventId,
						startTime,
						ack,
						payloadSize,
						retryCount
					);

					if (ack) {
						resolve(true);
					} else if (retryCount < maxRetries) {
						retryCount++;
						console.warn(
							`Retrying event ${eventId} (attempt ${retryCount}/${maxRetries})`
						);
						setTimeout(attempt, 100 * retryCount); // Exponential backoff
					} else {
						console.error(
							`Event ${eventId} failed after ${maxRetries} retries`
						);
						resolve(false);
					}
				});
			};

			attempt();
		});
	}

	// Data export and analysis methods
	exportAnalytics(): {
		session: UserBehaviorMetrics;
		events: DrawingEvent[];
		network: NetworkMetrics[];
		performance: PerformanceMetrics[];
		summary: any;
	} {
		return {
			session: this.userBehavior,
			events: this.events,
			network: this.networkMetrics,
			performance: this.performanceMetrics,
			summary: this.generateSummary(),
		};
	}

	private generateSummary() {
		const totalEvents = this.events.length;
		const avgRTT =
			this.networkMetrics.reduce((sum, m) => sum + m.rtt, 0) /
				this.networkMetrics.length || 0;
		const acknowledgedMessages = this.networkMetrics.filter(
			(m) => m.acknowledged
		);
		const nackMessages = this.networkMetrics.filter((m) => !m.acknowledged);
		const failedDataSend = nackMessages.reduce(
			(sum: number, i: NetworkMetrics) => sum + i.payloadSize,
			0
		);

		const successRate =
			(acknowledgedMessages.length / this.networkMetrics.length) * 100 || 0;
		const totalDataSend = acknowledgedMessages.reduce(
			(sum: number, i: NetworkMetrics) => sum + i.payloadSize,
			0
		);
		const totalDataAttempted = totalDataSend + failedDataSend;
		const dataEfficiencyRate = (totalDataSend / totalDataAttempted) * 100;
		const avgSuccessfulPayloadSize =
			totalDataSend / acknowledgedMessages.length;
		const avgFailedPayloadSize = failedDataSend / nackMessages.length;

		const avgFPS =
			this.performanceMetrics.reduce((sum, m) => sum + m.fps, 0) /
				this.performanceMetrics.length || 0;

		return {
			totalEvents,
			avgRTT: Math.round(avgRTT * 100) / 100,
			successRate: Math.round(successRate * 100) / 100,
			avgFPS: Math.round(avgFPS),
			totalDataSend: Math.round(totalDataSend),
			dataEfficiencyRate: Math.round(dataEfficiencyRate),
			avgSuccessfulPayloadSize: Math.round(avgSuccessfulPayloadSize),
			avgFailedPayloadSize: Math.round(avgFailedPayloadSize),
			sessionDuration: Date.now() - this.userBehavior.sessionStart,
			networkQualityDistribution: this.getNetworkQualityDistribution(),
		};
	}

	private getNetworkQualityDistribution() {
		const distribution = { excellent: 0, good: 0, fair: 0, poor: 0, decent: 0 };
		this.networkMetrics.forEach((metric) => {
			distribution[metric.connectionQuality]++;
		});
		return distribution;
	}

	// Real-time monitoring dashboard (console-based)
	startRealtimeMonitoring(intervalMs: number = 5000): void {
		setInterval(() => {
			const summary = this.generateSummary();
			console.log(
				'Session Duration:',
				`${Math.round(summary.sessionDuration / 1000)}s`
			);
			console.log('local storage', this.storage.getStorageInfo());

			console.log('sum: ', summary);

			console.groupEnd();
		}, intervalMs);
	}
	// Cleanup
	destroy(): void {
		if (this.syncTimer) {
			clearInterval(this.syncTimer);
		}
		this.syncNow(); // Final sync
	}
}

export default DrawingAnalytics;
