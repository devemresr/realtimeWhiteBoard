import { io } from 'socket.io-client';

declare global {
	interface Window {
		io: any;
	}
}
