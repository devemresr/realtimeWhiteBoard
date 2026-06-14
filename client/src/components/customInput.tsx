export default function CustomInput({
	title,
	isInvalid,
	area,
	placeholder,
	onChange,
	value,
	validationMessage,
	className,
}: {
	title?: string;
	isInvalid?: boolean;
	area: string;
	placeholder: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	value: string;
	validationMessage?: string;
	className?: string;
}) {
	return (
		<div className={className}>
			{title && <p className='text-gray-700 font-medium'>{title}</p>}
			<div
				className={`w-full border rounded-lg p-1.5 flex flex-row items-center ${isInvalid ? 'border-red-500' : 'border-gray-300'} border-gray-300 focus-within:border-purple-500 transition-colors shadow-sm`}
			>
				<input
					className='w-full outline-none'
					type={area === 'password' ? 'password' : 'text'}
					name={area}
					placeholder={placeholder}
					autoComplete='off'
					onChange={onChange}
					value={value}
				/>
			</div>
			<p
				className={`text-red-500 text-sm max-w-[390px] transition-all duration-300 ease-in-out ${isInvalid ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
			>
				{isInvalid && validationMessage && validationMessage}
			</p>
		</div>
	);
}
