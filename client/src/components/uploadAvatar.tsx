import { useUserStore } from 'src/store/UserStore';

export default function UploadAvatar({
	setAvatar,
	size = 'm',
}: {
	size?: 'm' | 'l';
	setAvatar?: (avatar: string) => void;
}) {
	const userStore = useUserStore();
	const user = userStore;
	return (
		<div className='flex flex-col items-center'>
			<img
				src={
					user.avatar ||
					'https://cdn.vectorstock.com/i/500p/71/90/blank-avatar-placeholder-icon-vector-30257190.jpg'
				}
				alt='avatar preview'
				className={`${size === 'm' ? 'w-20 h-20' : 'w-32 h-32'} aspect-square rounded-full`}
			/>
			<button
				className='text-gray-400 hover:text-gray-600 transition-colors'
				onClick={() => {
					// todo upload avatar and get url
					if (setAvatar) {
						setAvatar(
							'https://images.ctfassets.net/h6goo9gw1hh6/2sNZtFAWOdP1lmQ33VwRN3/24e953b920a9cd0ff2e1d587742a2472/1-intro-photo-final.jpg?w=1200&h=992&fl=progressive&q=70&fm=jpg',
						);
					}
					user.setUser({
						avatar:
							'https://images.ctfassets.net/h6goo9gw1hh6/2sNZtFAWOdP1lmQ33VwRN3/24e953b920a9cd0ff2e1d587742a2472/1-intro-photo-final.jpg?w=1200&h=992&fl=progressive&q=70&fm=jpg',
					});
				}}
			>
				Upload profile picture
			</button>
		</div>
	);
}
