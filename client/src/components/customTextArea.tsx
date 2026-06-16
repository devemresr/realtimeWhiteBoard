export default function CustomTextArea({
	title,
	isInvalid,
	area,
	placeholder,
	onChange,
	value,
	className,
	props,
}: {
	title?: string;
	isInvalid?: boolean;
	area: string;
	placeholder: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	value: string;
	className?: string;
	props?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}) {
	return (
		<div className={className}>
			{title && <p className='text-gray-700 font-medium'>{title}</p>}
			<div
				className={`w-full border rounded-lg p-1.5 flex flex-row items-center ${isInvalid ? 'border-red-500' : 'border-gray-300'} border-gray-300 focus-within:border-purple-500 transition-colors shadow-sm`}
			>
				<textarea
					className='w-full outline-none'
					name={area}
					placeholder={placeholder}
					onChange={onChange}
					value={value}
					{...props}
				/>
			</div>
			{props?.maxLength && (
				<p className='text-gray-400 text-xs text-right'>
					{value.length}/{props.maxLength}
				</p>
			)}
		</div>
	);
}
