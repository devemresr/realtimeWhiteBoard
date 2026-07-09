'use client';
import { useState } from 'react';
import {
	DownloadSVG,
	FolderSVG,
	InfoSVG,
	MenuSVG,
	MessageSVG,
	UsersSVG,
	UserSVG,
} from '../constants/svgs';
import { TbLogout } from 'react-icons/tb';
import { useModalStore } from 'src/store/ModalStore';
import AuthModal from 'src/modals/authModal';
import { useUserStore } from 'src/store/UserStore';
import CollabModal from 'src/modals/collabModal';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout } from 'src/hooks/api/endpoints/useFormPosts';
import logger from 'src/util/logger';
import RoomStatusModal from 'src/modals/roomStatusManager';
export default function Menu() {
	const [menuOpen, setMenuOpen] = useState(false);
	const modalStore = useModalStore();
	const { userId } = useUserStore();
	const resetUser = useUserStore((state) => state.resetUser);
	const logout = useLogout();
	const router = useRouter();
	const pathname = usePathname();
	const loggedIn = !!userId;
	const color = '#2f2f2f';
	const authenticatedMenuConfig = loggedIn
		? [
				{
					key: 'logout',
					icon: <TbLogout color={color} size={28} />,
					title: 'Log Out',
					subtitle: '',
					trigger: async () => {
						try {
							await logout.mutateAsync({});
							localStorage.clear();
							resetUser();
						} catch (error) {
							logger.error(error);
						}
					},
				},
				{
					key: 'account',
					icon: <UserSVG color={color} props={{ width: 28 }} />,
					title: 'Manage Account',
					subtitle: '',
					trigger: () => router.push('/manage-account'),
				},
			]
		: [
				{
					key: 'authenticate',
					icon: <UserSVG color={color} props={{ width: 28 }} />,
					title: 'Sign In',
					subtitle: '',
					trigger: () => {
						modalStore.openModal({ extra: <AuthModal /> });
					},
				},
			];
	const canvasMenuConfig =
		pathname === '/'
			? [
					{
						key: 'save',
						icon: <DownloadSVG color={color} props={{ width: 28 }} />,
						title: 'Save to...',
						subtitle: '',
						trigger: () => {},
					},
				]
			: [];
	const menuElementsConfig = [
		{
			key: 'new',
			icon: <FolderSVG color={color} props={{ width: 24 }} />,
			title: 'Open new',
			subtitle: 'Ctrl+O',
			trigger: () => router.push('/'),
		},
		...canvasMenuConfig,
		...authenticatedMenuConfig,

		{
			key: 'room-status',
			icon: <UsersSVG color={color} props={{ width: 28 }} />,
			title: 'Room Status',
			subtitle: '',
			trigger: () =>
				loggedIn
					? modalStore.openModal({
							title: 'Room Status',
							extra: <RoomStatusModal />,
						})
					: modalStore.openModal({ extra: <AuthModal /> }),
		},
		{
			key: 'live',
			icon: <UsersSVG color={color} props={{ width: 28 }} />,
			title: 'Live collaboration...',
			subtitle: '',
			trigger: () =>
				loggedIn
					? modalStore.openModal({
							title: 'Collaborate',
							extra: <CollabModal />,
						})
					: modalStore.openModal({ extra: <AuthModal /> }),
		},
		{
			key: 'help',
			icon: <InfoSVG color={color} props={{ width: 26 }} />,
			title: 'Help',
			subtitle: '?',
			trigger: () => {},
		},
		{
			key: 'language',
			icon: <MessageSVG color={color} props={{ width: 24 }} />,
			title: 'Language',
			subtitle: 'English',
			trigger: () => {},
		},
	];
	return (
		<>
			{menuOpen && (
				<div
					className='fixed w-screen h-screen top-0 left-0 z-10'
					style={{ backgroundColor: '#70707047' }}
					onClick={() => setMenuOpen(false)}
				></div>
			)}
			<button
				onClick={() => setMenuOpen(!menuOpen)}
				className={`w-8 h-8 z-10 bg-gray-100  shadow p-1.5 items-center justify-center rounded transition-colors hover:bg-purple-100 fixed left-2 top-2`}
			>
				<MenuSVG color={'#2f2f2f'} />
			</button>
			{menuOpen && (
				<div
					style={{ width: 240, zIndex: 100 }}
					className='container fixed left-2 top-12 bg-white border rounded-lg border-gray-200 p-2 shadow flex flex-col gap-1'
				>
					{menuElementsConfig.map((e) => {
						const onClick = async () => {
							try {
								await e.trigger?.();
							} catch (error) {
								console.error(error);
							} finally {
								setMenuOpen(false);
							}
						};
						return (
							<button
								className='w-full rounded h-8 flex flex-row items-center gap-1 px-1 transition-colors hover:bg-purple-100'
								onClick={onClick}
								key={e.key}
							>
								{e.icon}
								<span className='w-full flex flex-row justify-between'>
									<p>{e.title}</p>
									{e.subtitle && <p className='text-gray-400'>{e.subtitle}</p>}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</>
	);
}
