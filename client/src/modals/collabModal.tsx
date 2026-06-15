import { useState } from 'react';
import { useModalStore } from 'src/store/ModalStore';
import { collabButtons } from './config';
import CreateRoom from 'src/components/createRoom';
import JoinRoom from 'src/components/joinRoom';

export default function CollabModal() {
	const [CollabMode, setCollabMode] = useState<'create' | 'join' | null>(null);
	const { closeModal } = useModalStore();
	const [roomForm, setRoomForm] = useState({
		name: '',
		code: '',
		private: false,
		password: '',
	});

	const handleRoomForm = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, type, value, checked } = e.target;
		setRoomForm((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	return (
		<div>
			<div
				className={`flex justify-between items-center ${CollabMode !== null ? 'h-12' : 'h-40'} transition-all duration-[800ms] ease-in-out`}
			>
				{collabButtons.map((btn) => {
					const isSelected = CollabMode === btn.key;
					return (
						<button
							key={btn.key}
							className='relative group w-40 h-full overflow-hidden rounded-xl'
							onClick={() => {
								setCollabMode(btn.key as 'create' | 'join');
							}}
						>
							<p className='relative z-10 text-white'>{btn.label}</p>
							<div
								className={`absolute top-0 left-0 z-0 w-full h-full bg-gray-200
        										transition-colors duration-[1500ms] ease-in-out
        										blur-lg
        										${btn.bgHover}
        										${isSelected ? `${btn.bg}` : ''}
      										`}
							>
								{btn.shapes.map((shape, i) => (
									<div
										key={i}
										className={`
            absolute rounded-3xl z-1
            transition-all duration-[1500ms] ease-in-out
            ${shape.cls}
            ${shape.shapeHover}
            ${shape.colorHover}
            ${isSelected ? `${shape.animation} ${shape.bg}` : ''}
          `}
									/>
								))}
							</div>
						</button>
					);
				})}
			</div>
			<div
				className={`
    overflow-hidden
    transition-all duration-300 ease-in-out
    ${CollabMode ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
  `}
			>
				{CollabMode === 'create' ? (
					<CreateRoom roomForm={roomForm} handleRoomForm={handleRoomForm} />
				) : (
					<JoinRoom />
				)}
			</div>
		</div>
	);
}
