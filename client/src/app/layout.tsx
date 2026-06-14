'use client';

import './app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { createElement, useState } from 'react';
import { cursors } from '../components/config';
import Modal from 'src/components/modal';
import Menu from 'src/components/menu';
// import { CanvasStateProvider } from 'src/contexts/CanvasStateContext';
export default function RootLayout({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute
					},
				},
			}),
	);

	return (
		<html lang='en'>
			<body>
				<style>
					{` /* Apply custom cursor globally and for all states */
					button *, a *, .hover *, input *, .focus * , label * {
					  cursor: inherit !important;
					}
          html, body, *, label, button, a, input,
          .disabled, a:disabled, input:disabled {
            cursor: ${cursors['cursor-default']}, auto;
          }
          button:hover, a:hover, input:hover, .hover:hover {
            cursor: ${cursors['cursor-hand-pointing']}, auto;
          }
          button:active, a:active, input:active, .focus:active {
            cursor: ${cursors['cursor-hand-grabbing']}, auto;
          }`}
				</style>
				<QueryClientProvider client={queryClient}>
					{/* <CanvasStateProvider>
						</CanvasStateProvider> */}
					<Modal />
					<Menu />
					{children}
					{process.env.NODE_ENV === 'development' &&
						createElement(ReactQueryDevtools as any, {
							initialIsOpen: false,
						})}
				</QueryClientProvider>
			</body>
		</html>
	);
}
