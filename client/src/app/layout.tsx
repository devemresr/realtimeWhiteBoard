'use client';

import './app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { createElement, useState } from 'react';

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
				<QueryClientProvider client={queryClient}>
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
