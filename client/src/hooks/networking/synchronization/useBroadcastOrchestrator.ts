import { useEffect, useRef } from 'react';
import { DrawIncrementalPathFn } from '../../canvas/drawing/useCanvasDrawing';
import { ReceivedPacketManager } from '../packets/ReceivedPacketManager';
import { BroadcastRenderer } from './BroadcastRenderer';
import { useGapHandler } from './useGapHandler';

// Orchestrator hook - owns all broadcast rendering concerns.
// Instantiates classes for stateful logic, keeps useGapHandler as a hook
// for automatic timer cleanup on unmount, then wires everything together.
export const useBroadcastOrchestrator = (
	drawIncrementalPath: DrawIncrementalPathFn,
) => {
	// Wrap drawIncrementalPath in a ref so BroadcastRenderer never holds
	// a stale closure - brushOptions changes recreate the fn but the ref stays stable
	const drawIncrementalPathRef = useRef(drawIncrementalPath);
	useEffect(() => {
		drawIncrementalPathRef.current = drawIncrementalPath;
	}, [drawIncrementalPath]);

	const packetManager = useRef(new ReceivedPacketManager());

	const renderer = useRef(
		new BroadcastRenderer(packetManager.current, drawIncrementalPathRef),
	);

	const gapHandler = useGapHandler({
		apiCallTimeout: 300,
		permanentTimeout: 1500,
		fetchPacket: (strokeId, sequence) =>
			renderer.current.fetchPacket(strokeId, sequence),
	});

	// Wire gap callbacks into the handler - stored in a ref inside useGapHandler
	// so timers always read the latest version without dep array churn
	gapHandler.setCallbacks({
		handleGapFilled: (packet, sequence) =>
			renderer.current.handleGapFilled(packet, sequence),
		handleGapPermanent: (packet, sequence) =>
			renderer.current.handleGapPermanent(packet, sequence),
	});

	// Bridge gap detection events from BroadcastRenderer to useGapHandler
	renderer.current.onNewGap = (packet, sequence) =>
		gapHandler.startGapTimeout(packet, sequence);
	renderer.current.onGapResolved = (strokeId, sequence) =>
		gapHandler.cancelGapTimeout(strokeId, sequence);

	return {
		drawBroadcastPath: renderer.current.drawBroadcastPath,
	};
};
