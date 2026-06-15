import { ReactElement } from 'react';

export type ModalState = {
	visible: boolean;
	title: string;
	text: string;
	buttons: { title: string; color?: string }[];
	extra: ReactElement;
};
export type ModalActions = {
	openModal: (props: Partial<ModalState>) => void;
	closeModal: () => void;
	resetModalStore: () => void;
};

export type UserState = {
	userId: string;
	name: string;
	username: string;
	surname: string;
	email: string;
	avatarUrl: string;
};
export type UserActions = {
	setUser: (user: Partial<UserState>) => void;
	resetUser: () => void;
};
