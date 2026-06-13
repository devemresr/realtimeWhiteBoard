export default function UploadAvatar({
	avatar,
	setAvatar,
}: {
	avatar: string;
	setAvatar: (avatar: string) => void;
}) {
	return (
		<div className='flex flex-col items-center'>
			<img
				src={avatar}
				alt='avatar preview'
				className='w-20 h-20 rounded-full'
			/>
			<button
				className='text-gray-400 hover:text-gray-600 transition-colors'
				onClick={() => {
					// todo upload avatar and get url
					setAvatar(
						'https://images.ctfassets.net/h6goo9gw1hh6/2sNZtFAWOdP1lmQ33VwRN3/24e953b920a9cd0ff2e1d587742a2472/1-intro-photo-final.jpg?w=1200&h=992&fl=progressive&q=70&fm=jpg',
					);
				}}
			>
				Upload profile picture
			</button>
		</div>
	);
}
