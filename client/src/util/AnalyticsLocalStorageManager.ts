import sizeof from 'object-sizeof';

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

interface AnalyticsPayload {
	sessionId: string;
	events: DrawingEvent[];
	networkMetrics: NetworkMetrics[];
	performanceMetrics: PerformanceMetrics[];
	userBehavior: UserBehaviorMetrics;
	timestamp: number;
}

class AnalyticsLocalStorageManager {
	public readonly STORAGE_KEYS = {
		EVENTS: 'drawing_analytics_events',
		NETWORK: 'drawing_analytics_network',
		PERFORMANCE: 'drawing_analytics_performance',
		USER_BEHAVIOR: 'drawing_analytics_behavior',
		SYNC_QUEUE: 'drawing_analytics_sync_queue',
		LAST_SYNC: 'drawing_analytics_last_sync', // todo use it after a successful sync to the backend
	} as const;

	// Store data with size management
	storeData<T>(key: string, data: T[]): void {
		try {
			const serialized = JSON.stringify(data);
			// If data is getting too large (>5MB), keep only recent items
			if (sizeof(serialized) / (1024 * 1024) > 5) {
				const recentData = data.slice(-1000); // Keep last 1000 items
				localStorage.setItem(key, JSON.stringify(recentData));
				console.warn(
					`Storage size exceeded for ${key}, keeping recent ${recentData.length} items`
				);
			} else {
				localStorage.setItem(key, serialized);
			}
		} catch (error) {
			console.error(`Failed to store ${key}:`, error);
			this.handleStorageError(key, data);
		}
	}

	getData<T>(key: string): T[] {
		try {
			const data = localStorage.getItem(key);
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error(`Failed to retrieve ${key}:`, error);
			return [];
		}
	}

	appendData<T>(key: string, newItem: T): void {
		const existing = this.getData<T>(key);
		existing.push(newItem);
		this.storeData(key, existing);
	}

	updateUserBehavior(behavior: UserBehaviorMetrics): void {
		localStorage.setItem(
			this.STORAGE_KEYS.USER_BEHAVIOR,
			JSON.stringify(behavior)
		);
	}

	getUserBehavior(): UserBehaviorMetrics | null {
		const data = localStorage.getItem(this.STORAGE_KEYS.USER_BEHAVIOR);
		return data ? JSON.parse(data) : null;
	}

	// Queue data for syncing
	queueForSync(sessionId: string): void {
		const payload: AnalyticsPayload = {
			sessionId,
			events: this.getData<DrawingEvent>(this.STORAGE_KEYS.EVENTS),
			networkMetrics: this.getData<NetworkMetrics>(this.STORAGE_KEYS.NETWORK),
			performanceMetrics: this.getData<PerformanceMetrics>(
				this.STORAGE_KEYS.PERFORMANCE
			),
			userBehavior: this.getUserBehavior() || ({} as UserBehaviorMetrics),
			timestamp: Date.now(),
		};

		const syncQueue = this.getData<AnalyticsPayload>(
			this.STORAGE_KEYS.SYNC_QUEUE
		);
		syncQueue.push(payload);
		this.storeData(this.STORAGE_KEYS.SYNC_QUEUE, syncQueue);
	}

	getSyncQueue(): AnalyticsPayload[] {
		return this.getData<AnalyticsPayload>(this.STORAGE_KEYS.SYNC_QUEUE);
	}

	clearSyncedData(timestamp: number): void {
		const queue = this.getSyncQueue().filter(
			(item) => item.timestamp > timestamp
		);
		this.storeData(this.STORAGE_KEYS.SYNC_QUEUE, queue);
	}

	clearLocalData(): void {
		Object.values(this.STORAGE_KEYS).forEach((key) => {
			if (key !== this.STORAGE_KEYS.SYNC_QUEUE) {
				localStorage.removeItem(key);
			}
		});
	}

	private handleStorageError<T>(key: string, data: T[]): void {
		// Try to clear old data and retry
		if (Array.isArray(data) && data.length > 100) {
			const reducedData = data.slice(-50);
			try {
				localStorage.setItem(key, JSON.stringify(reducedData));
				console.warn(`Reduced ${key} data size and retried`);
			} catch {
				console.error(`Critical storage error for ${key}`);
			}
		}
	}

	getStorageInfo() {
		const info = Object.entries(this.STORAGE_KEYS).map(([name, key]) => {
			const data = localStorage.getItem(key);
			const size = data ? new Blob([data]).size : 0;
			return {
				name,
				key,
				size: `${(size / 1024).toFixed(2)} KB`,
				items: data ? JSON.parse(data).length || 1 : 0,
			};
		});
		return info;
	}
}

export default AnalyticsLocalStorageManager;
