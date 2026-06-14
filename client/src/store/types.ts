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
	id: string;
	name: string;
	username: string;
	email: string;
	avatar: string;
};
export type UserActions = {
	setUser: (user: UserState) => void;
	resetUser: () => void;
	loggedIn: () => boolean;
};
