import { useCallback, useRef } from 'react';
import { Point, PacketStatus, StrokePacket } from '@/types';

export const useCanvasState = () => {
	const allStrokes = useRef<Map<string, Map<string, StrokePacket>>>(new Map());

	// Efficient indexes: strokeId -> Set of packetIds
	const needsRetryIndex = useRef<Map<string, Set<string>>>(new Map()); // FAILED packets by stroke
	const pendingSendIndex = useRef<Map<string, Set<string>>>(new Map()); // CREATED packets by stroke

	const storePacket = useCallback((packet: StrokePacket) => {
		let strokeMap = allStrokes.current.get(packet.strokeId);

		if (!strokeMap) {
			strokeMap = new Map();
			allStrokes.current.set(packet.strokeId, strokeMap);
		}

		strokeMap.set(packet.packetId, packet);

		// Update indexes
		if (packet.status === PacketStatus.CREATED) {
			if (!pendingSendIndex.current.has(packet.strokeId)) {
				pendingSendIndex.current.set(packet.strokeId, new Set());
			}
			pendingSendIndex.current.get(packet.strokeId)!.add(packet.packetId);
		} else if (packet.status === PacketStatus.FAILED) {
			if (!needsRetryIndex.current.has(packet.strokeId)) {
				needsRetryIndex.current.set(packet.strokeId, new Set());
			}
			needsRetryIndex.current.get(packet.strokeId)!.add(packet.packetId);
		}
	}, []);

	const updatePacketStatus = useCallback(
		(strokeId: string, packetId: string, status: PacketStatus): boolean => {
			const packet = allStrokes.current.get(strokeId)?.get(packetId);

			if (!packet) {
				console.warn(`Packet not found: ${strokeId}/${packetId}`);
				return false;
			}

			// Remove from old indexes
			needsRetryIndex.current.get(strokeId)?.delete(packetId);
			pendingSendIndex.current.get(strokeId)?.delete(packetId);

			const updatedPacket: StrokePacket = {
				...packet,
				status,
				lastAttemptTimestamp:
					status === PacketStatus.SENDING
						? Date.now()
						: packet.lastAttemptTimestamp,
			};

			allStrokes.current.get(strokeId)!.set(packetId, updatedPacket);

			// Add to new indexes
			if (status === PacketStatus.FAILED) {
				if (!needsRetryIndex.current.has(strokeId)) {
					needsRetryIndex.current.set(strokeId, new Set());
				}
				needsRetryIndex.current.get(strokeId)!.add(packetId);
			} else if (status === PacketStatus.CREATED) {
				if (!pendingSendIndex.current.has(strokeId)) {
					pendingSendIndex.current.set(strokeId, new Set());
				}
				pendingSendIndex.current.get(strokeId)!.add(packetId);
			}

			return true;
		},
		[]
	);

	// Get packets that need to be sent for a specific stroke (CREATED status)
	const getPacketsToSendForStroke = useCallback(
		(strokeId: string): StrokePacket[] => {
			const packetIds = pendingSendIndex.current.get(strokeId);
			if (!packetIds || packetIds.size === 0) return [];

			const strokeMap = allStrokes.current.get(strokeId);
			if (!strokeMap) return [];

			const packets: StrokePacket[] = [];
			packetIds.forEach((packetId) => {
				const packet = strokeMap.get(packetId);
				if (packet) packets.push(packet);
			});

			return packets.sort(
				(a, b) => a.packetSequenceNumber - b.packetSequenceNumber
			);
		},
		[]
	);

	// Get all packets that need to be sent (CREATED status)
	const getAllPacketsToSend = useCallback((): StrokePacket[] => {
		const result: StrokePacket[] = [];

		for (const strokeId of pendingSendIndex.current.keys()) {
			const pendingPackets = pendingSendIndex.current.get(strokeId);
			if (!pendingPackets) continue;

			for (const packetId of pendingPackets) {
				result.push(getPacket(strokeId, packetId));
			}
		}

		return result;
	}, []);

	// Get all packets that need retry (FAILED status)
	const getAllPacketsNeedingRetry = useCallback((): StrokePacket[] => {
		const result: StrokePacket[] = [];

		for (const strokeId of needsRetryIndex.current.keys()) {
			const needsRetryPackets = needsRetryIndex.current.get(strokeId);
			if (!needsRetryPackets) continue;

			for (const packetId of needsRetryPackets) {
				result.push(getPacket(strokeId, packetId));
			}
		}
		return result;
	}, []);

	const getPacket = useCallback(
		(strokeId: string, packetId: string): StrokePacket | undefined => {
			return allStrokes.current.get(strokeId)?.get(packetId);
		},
		[]
	);

	const getPoints = useCallback(
		(strokeId: string, packetId: string): Point[] | undefined => {
			return allStrokes.current.get(strokeId)?.get(packetId)?.points;
		},
		[]
	);

	const getStrokePackets = useCallback(
		(strokeId: string): StrokePacket[] | undefined => {
			const strokeMap = allStrokes.current.get(strokeId);
			if (!strokeMap) return undefined;

			return Array.from(strokeMap.values()).sort(
				(a, b) => a.packetSequenceNumber - b.packetSequenceNumber
			);
		},
		[]
	);

	const getAllPointsForStroke = useCallback(
		(strokeId: string): Point[] => {
			const packets = getStrokePackets(strokeId);
			if (!packets) return [];

			return packets.flatMap((packet) => packet.points);
		},
		[getStrokePackets]
	);

	const hasStroke = useCallback((strokeId: string): boolean => {
		return allStrokes.current.has(strokeId);
	}, []);

	const hasPacket = useCallback(
		(strokeId: string, packetId: string): boolean => {
			return allStrokes.current.get(strokeId)?.has(packetId) ?? false;
		},
		[]
	);

	const getPacketCount = useCallback((strokeId: string): number => {
		return allStrokes.current.get(strokeId)?.size ?? 0;
	}, []);

	// Check if stroke has pending sends
	const hasPendingSends = useCallback((strokeId: string): boolean => {
		const packetIds = pendingSendIndex.current.get(strokeId);
		return packetIds ? packetIds.size > 0 : false;
	}, []);

	// Check if stroke has failed packets
	const hasFailedPackets = useCallback((strokeId: string): boolean => {
		const packetIds = needsRetryIndex.current.get(strokeId);
		return packetIds ? packetIds.size > 0 : false;
	}, []);

	// Get count of pending/failed packets for a stroke
	const getStrokeStatusCounts = useCallback((strokeId: string) => {
		return {
			pending: pendingSendIndex.current.get(strokeId)?.size || 0,
			failed: needsRetryIndex.current.get(strokeId)?.size || 0,
		};
	}, []);

	const clearStroke = useCallback((strokeId: string) => {
		// Clean up indexes
		needsRetryIndex.current.delete(strokeId);
		pendingSendIndex.current.delete(strokeId);

		// Clear stroke data
		allStrokes.current.delete(strokeId);
	}, []);

	const clearAllStrokes = useCallback(() => {
		allStrokes.current.clear();
		needsRetryIndex.current.clear();
		pendingSendIndex.current.clear();
	}, []);

	const getAllStrokeIds = useCallback((): string[] => {
		return Array.from(allStrokes.current.keys());
	}, []);

	// Get statistics for monitoring
	const getStats = useCallback(() => {
		let total = 0;
		let created = 0;
		let sending = 0;
		let sent = 0;
		let failed = 0;
		let abandoned = 0;

		allStrokes.current.forEach((strokeMap) => {
			strokeMap.forEach((packet) => {
				total++;
				switch (packet.status) {
					case PacketStatus.CREATED:
						created++;
						break;
					case PacketStatus.SENDING:
						sending++;
						break;
					case PacketStatus.SENT:
						sent++;
						break;
					case PacketStatus.FAILED:
						failed++;
						break;
					case PacketStatus.ABANDONED:
						abandoned++;
						break;
				}
			});
		});

		return {
			total,
			created,
			sending,
			sent,
			failed,
			abandoned,
			strokesWithPending: pendingSendIndex.current.size,
			strokesWithFailed: needsRetryIndex.current.size,
		};
	}, []);

	return {
		storePacket,
		updatePacketStatus,
		getPacket,
		getPoints,
		getStrokePackets,
		getAllPointsForStroke,
		getPacketsToSendForStroke,
		getAllPacketsToSend,
		getAllPacketsNeedingRetry,
		hasStroke,
		hasPacket,
		getPacketCount,
		hasPendingSends,
		hasFailedPackets,
		getStrokeStatusCounts,
		clearStroke,
		clearAllStrokes,
		getAllStrokeIds,
		getStats,
	};
};
