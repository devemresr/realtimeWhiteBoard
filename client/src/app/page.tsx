'use client';
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import BasicBrushCanvas from '../components/basicCanvas';

const ChatApp = () => {
	const socket = io('http://localhost:3000');

	return (
		<>
			<div className='border-8 border-black h-9 w-9 bg-black'>here</div>
			<BasicBrushCanvas></BasicBrushCanvas>
		</>
	);
};

export default ChatApp;
