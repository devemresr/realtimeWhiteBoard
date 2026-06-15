import { useUserStore } from 'src/store/UserStore';

export default function UploadAvatar({
	avatar,
	setAvatar,
	size = 'm',
}: {
	avatar?: string;
	setAvatar: (avatar: string) => void;
	size?: 'm' | 'l';
}) {
	const userStore = useUserStore();
	const user = userStore;

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const localUrl = URL.createObjectURL(file);
		setAvatar(localUrl);
		user.setUser({ avatar: localUrl });

		const formData = new FormData();
		formData.append('avatar', file);

		// todo finish
		const res = await fetch('/api/upload-avatar', {
			method: 'POST',
			body: formData,
		});
		const { url } = await res.json();
		setAvatar(url);
		user.setUser({ avatar: url });
	};

	return (
		<div className='flex flex-col items-center gap-2'>
			<img
				src={
					avatar ||
					user.avatar ||
					'https://cdn.vectorstock.com/i/500p/71/90/blank-avatar-placeholder-icon-vector-30257190.jpg'
				}
				alt='avatar preview'
				className={`${size === 'm' ? 'w-20 h-20' : 'w-32 h-32'} aspect-square rounded-full object-cover`}
			/>
			<label className='text-gray-400 hover:text-gray-600 transition-colors cursor-pointer'>
				Upload profile picture
				<input
					type='file'
					accept='image/*'
					className='hidden'
					onChange={handleFileChange}
				/>
			</label>
		</div>
	);
}
