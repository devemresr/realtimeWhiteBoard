// Server-side
export const getRooms = async (io) => {
	// Gets all sockets across all nodes, then derive rooms from them
	const sockets = await io.fetchSockets();
	const rooms = new Map<string, number>();

	for (const socket of sockets) {
		for (const room of socket.rooms) {
			if (room !== socket.id) {
				// filter default socket rooms
				rooms.set(room, (rooms.get(room) ?? 0) + 1);
			}
		}
	}
	return rooms;
};
