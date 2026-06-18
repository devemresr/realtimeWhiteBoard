import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface SocketStore {
	socket: Socket | null;
	setSocket: (socket: Socket | null) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
	socket: null,
	setSocket: (socket) => set({ socket }),
}));
