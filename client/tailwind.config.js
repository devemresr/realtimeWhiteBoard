module.exports = {
	content: [
		'./src/**/*.{js,ts,jsx,tsx}',
		'./src/app/**/*.{js,ts,jsx,tsx}',
		'./src/components/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		extend: {
			keyframes: {
				modalBounce: {
					'0%': { opacity: '0', transform: 'scale(0.8)' },
					'60%': { opacity: '1', transform: 'scale(1.05)' },
					'80%': { transform: 'scale(0.98)' },
					'100%': { transform: 'scale(1)' },
				},
			},
			animation: {
				'modal-bounce': 'modalBounce 0.35s ease-out',
			},
		},
	},
	plugins: [],
};
