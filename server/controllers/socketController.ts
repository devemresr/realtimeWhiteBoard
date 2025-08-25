import {
	REDIS_STREAM_EVENTS,
	SOCKET_EVENTS,
} from '../../shared/constants/socketIoConstants';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import RedisStreamManager from '../services/RedisStreamManager';

class SocketController {
	private io: Server;
	private readStreamManager: RedisStreamManager; // For consuming
	private writeStreamManager: RedisStreamManager; // For writing
	private isStreamConsumerSetup: boolean = false;
	private initialized: boolean = false;

	constructor(io: Server) {
		this.io = io;
		this.readStreamManager = new RedisStreamManager();
		this.writeStreamManager = new RedisStreamManager();
		this.handleConnection = this.handleConnection.bind(this);
		this.handleDrawingPacket = this.handleDrawingPacket.bind(this);
	}
	async initialize() {
		if (this.initialized) return;
		try {
			await this.initializeStreams();
			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize SocketController:', error);
			throw error;
		}
	}

	// Initialize Redis streams once for the entire server
	private async initializeStreams() {
		try {
			await this.writeStreamManager.initialize(
				REDIS_STREAM_EVENTS.DRAWING_EVENT,
				{
					host: 'localhost',
					port: 6379,
				}
			);
			await this.readStreamManager.initialize(
				REDIS_STREAM_EVENTS.COMPLETED_DRAWING_EVENT,
				{
					host: 'localhost',
					port: 6379,
				}
			);

			await this.readStreamManager.createConsumerGroup(
				REDIS_STREAM_EVENTS.COMPLETED_DRAWING_EVENT,
				'testSocketServers'
			);

			// Set up consumer only once for the entire server
			if (!this.isStreamConsumerSetup) {
				this.readStreamManager
					.consumeFromGroup(
						REDIS_STREAM_EVENTS.COMPLETED_DRAWING_EVENT,
						'testSocketServers',
						this.handleDrawingPacket
					)
					.catch((error) => {
						console.error('Consumer error:', error);
					});
				this.isStreamConsumerSetup = true;
			}
		} catch (error) {
			console.error('Failed to initialize streams:', error);
		}
	}

	// Handle individual client connections
	async handleConnection(socket: Socket) {
		if (!this.initialized) {
			return;
		}
		try {
			console.log('New client connected:', socket.id);

			this.registerEventHandlers(socket);
			socket.on('disconnect', (reason) => {
				console.log('Client disconnected:', socket.id, 'Reason:', reason);
				// this.handleDisconnect(socket);
			});
		} catch (error) {
			console.error('ERROR in handleConnection:', error);
			socket.disconnect(true);
		}
	}
	// Register all socket event handlers for a specific socket
	private registerEventHandlers(socket: Socket) {
		socket.on(SOCKET_EVENTS.DRAWING_PACKET, (data, callback) => {
			this.handleRedisStreamWriteUp(socket, data, callback);
		});
	}

	// Handle writing to Redis stream
	private async handleRedisStreamWriteUp(
		socket: Socket,
		messageData: any,
		callback?: Function
	) {
		try {
			await this.writeStreamManager.addMessage({
				socketId: socket.id,
				timestamp: Date.now(),
				messageData,
			});

			// Acknowledge the client if callback provided
			if (callback) {
				callback({ success: true });
			}
		} catch (error) {
			console.error(
				'Error in handleRedisStreamWriteUp:',
				(error as Error).message
			);
			if (callback) {
				callback({ success: false, error: (error as Error).message });
			}
		}
	}

	// Handle drawing packet from Redis stream
	private async handleDrawingPacket(
		redisMessage: any,
		messageId: string,
		streamName: string
	) {
		if (!this.initialized) return;
		try {
			// Broadcast to all connected clients
			console.log('Broadcasting:');

			this.io.emit(SOCKET_EVENTS.RECEIVED_DATA, {
				messageId,
				streamName,
				data: redisMessage.data.data,
			});
		} catch (error) {
			console.error('Error in handleDrawingPacket:', error);
		}
	}

	// Handle individual socket disconnect
	// private handleDisconnect(socket: Socket) {
	// 	// Clean up any socket-specific resources here
	// 	console.log(`Cleaning up resources for socket: ${socket.id}`);
	// }

	// Clean up method for graceful shutdown
	async cleanup() {
		try {
			// Add cleanup logic for stream manager if needed
			console.log('Cleaning up SocketController resources');
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	}
}

export default SocketController;
