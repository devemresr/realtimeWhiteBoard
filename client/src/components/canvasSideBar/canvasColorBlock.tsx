export default function CanvasColorBlock({
	setBrushColor,
}: {
	setBrushColor: React.Dispatch<React.SetStateAction<string>>;
}) {
	const colorConfig = {
		topRow: ['#ec4899', '#ef4444', '#fb923c', '#fde047'],
		bottomRow: ['#22c55e', '#3b82f6', '#a855f7', '#000000'],
	};
	return (
		<div className='relative flex flex-col gap-1'>
			<div className='relative flex flex-row gap-1'>
				{colorConfig.topRow.map((color) => (
					<button
						key={color}
						onClick={() => setBrushColor(color)}
						className='w-5 h-5 p-1 rounded cursor-pointer'
						style={{ backgroundColor: color }}
					/>
				))}
			</div>
			<div className='relative flex flex-row gap-1'>
				{colorConfig.bottomRow.map((color) => (
					<button
						key={color}
						onClick={() => setBrushColor(color)}
						className='w-5 h-5 p-1 rounded cursor-pointer'
						style={{ backgroundColor: color }}
					/>
				))}
			</div>
		</div>
	);
}
