import { useEffect, useRef } from 'react';
import { textSizeConfig } from './config';

export default function CanvasText({
	textEditor,
	setTextEditor,
	canvasRef,
	brushColor,
	textStyle,
	setSelectedElement,
}) {
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const selectedTextSize = textSizeConfig.find(
		(item) => item.key === textStyle.size,
	).fontSize;
	useEffect(() => {
		if (textEditor) {
			inputRef.current?.focus();
		}
	}, [textEditor]);
	const fontWeight = textStyle.design === 'bold' ? 'bold' : 'normal';
	const fontStyle = textStyle.design === 'italic' ? 'italic' : 'normal';
	return (
		textEditor && (
			<textarea
				ref={inputRef}
				autoFocus
				value={textEditor.value}
				onChange={(e) =>
					setTextEditor((prev) =>
						prev ? { ...prev, value: e.target.value } : null,
					)
				}
				onKeyDown={(e) => {
					if (e.key !== 'Enter') return;

					const canvas = canvasRef.current;
					const ctx = canvas?.getContext('2d');

					if (!ctx) return;

					ctx.font = `${fontStyle} ${fontWeight} ${selectedTextSize} Arial`;
					ctx.fillStyle = brushColor;

					ctx.fillText(textEditor.value, textEditor.x, textEditor.y);
					if (textStyle.design === 'underline') {
						const metrics = ctx.measureText(textEditor.value);

						ctx.beginPath();
						ctx.moveTo(textEditor.x, textEditor.y + 2);
						ctx.lineTo(textEditor.x + metrics.width, textEditor.y + 2);
						ctx.strokeStyle = ctx.fillStyle;
						ctx.stroke();
					}

					setTextEditor(null);
					setSelectedElement('pointer');
				}}
				className='absolute border bg-white outline-none font-bold'
				style={{
					textDecoration:
						textStyle.design === 'underline' ? 'underline' : 'none',
					fontSize: selectedTextSize,
					fontWeight: fontWeight,
					color: brushColor,
					left: textEditor.x + 24,
					top: textEditor.y - 18,
				}}
			/>
		)
	);
}
