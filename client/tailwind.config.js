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
				float1: {
					'0%': { transform: 'translate(0px, 0px) scale(1)' },
					'25%': { transform: 'translate(4px, -3px) scale(1.01)' },
					'50%': { transform: 'translate(-2px, 4px) scale(1)' },
					'75%': { transform: 'translate(3px, -2px) scale(1.01)' },
					'100%': { transform: 'translate(0px, 0px) scale(1)' },
				},
				float2: {
					'0%': { transform: 'translate(0px, 0px) scale(1)' },
					'30%': { transform: 'translate(-4px, 3px) scale(1.01)' },
					'60%': { transform: 'translate(3px, -3px) scale(0.99)' },
					'100%': { transform: 'translate(0px, 0px) scale(1)' },
				},
				float3: {
					'0%': { transform: 'translate(0px, 0px) scale(1)' },
					'25%': { transform: 'translate(-4px, 3px) scale(1.02)' },
					'50%': { transform: 'translate(3px, 6px) scale(1)' },
					'75%': { transform: 'translate(-3px, -2px) scale(1.02)' },
					'100%': { transform: 'translate(0px, 0px) scale(1)' },
				},
			},
			animation: {
				'modal-bounce': 'modalBounce 0.35s ease-out',
				float1: 'float1 4s ease-in-out infinite',
				float2: 'float2 4s ease-in-out infinite',
				float3: 'float3 4s ease-in-out infinite',
			},
		},
	},
	plugins: [],
};
