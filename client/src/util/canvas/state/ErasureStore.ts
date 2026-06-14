/**
 * ErasureStore
 *
 * Simple set-backed store that tracks which stroke IDs have been erased.
 *
 * Kept as its own class because erasure is a first-class domain concept that
 * affects rendering (skip erased strokes), collision detection (don't re-erase
 * an already-erased stroke), and packet retrieval (`getAllNonErasedDrawingPackets`).
 * Centralising this state makes all three concerns easy to query without coupling
 * them to each other.
 */
export class ErasureStore {
	/** Set of strokeIds that have been erased by the user */
	private erasedStrokes = new Set<string>();

	/** Mark a stroke as erased. Idempotent - safe to call multiple times. */
	mark(strokeId: string) {
		this.erasedStrokes.add(strokeId);
	}

	/** Returns true when the stroke has been erased. */
	isErased(strokeId: string): boolean {
		return this.erasedStrokes.has(strokeId);
	}

	/** Remove the erasure record for a stroke (e.g. on undo or clear). */
	delete(strokeId: string) {
		this.erasedStrokes.delete(strokeId);
	}

	clear() {
		this.erasedStrokes.clear();
	}
}
