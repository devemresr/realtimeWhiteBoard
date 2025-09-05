'use client';

import './app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { createElement, useState } from 'react';
// todo change the devtools to be hidden in prod
// const ReactQueryDevtoolsProduction = React.lazy(() =>
// 	import('@tanstack/react-query-devtools/production').then((d) => ({
// 		default: d.ReactQueryDevtools,
// 	}))
// );

export default function RootLayout({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute
					},
				},
			})
	);

	return (
		<html lang='en'>
			<body>
				<QueryClientProvider client={queryClient}>
					{children}
					{process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' &&
						createElement(ReactQueryDevtools as any, { initialIsOpen: false })}
				</QueryClientProvider>
			</body>
		</html>
	);
}
