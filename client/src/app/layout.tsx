import './app.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from './provider';

export const metadata: Metadata = {
	title: 'Real Time Canvas',
	description: '',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='en'>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
