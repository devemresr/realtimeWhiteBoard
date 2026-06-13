import { useModalStore } from 'src/store/ModalStore';
import { IoCloseOutline } from 'react-icons/io5';
export default function Modal() {
	const { visible, title, text, buttons, extra, closeModal } = useModalStore();
	return !visible ? null : (
		<div>
			<div
				className='fixed w-screen h-screen top-0 left-0 z-10'
				style={{ backgroundColor: '#63636347' }}
			></div>
			<div className='fixed inset-0 z-20 flex items-center justify-center'>
				<div className='bg-white rounded-xl p-6 flex flex-col gap-4 min-w-[400px] shadow-sm animate-modal-bounce'>
					<button
						className='fixed self-end text-gray-500 hover:text-gray-700'
						onClick={() => closeModal()}
					>
						<IoCloseOutline size={22} />
					</button>
					{title && (
						<h1 className='text-xl font-semibold text-center'>{title}</h1>
					)}
					{text && <p>{text}</p>}
					{extra && extra}
					{buttons && (
						<div>
							{buttons.map((btn) => (
								<button
									className='text-white'
									style={{ backgroundColor: btn.color || '#9b45ed' }}
								>
									{btn.title}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
