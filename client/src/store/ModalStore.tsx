import { create } from 'zustand';
import { ModalActions, ModalState } from './types';

const initialState: ModalState = {
	visible: false,
	title: undefined,
	text: undefined,
	buttons: [],
	extra: undefined,
};
export const useModalStore = create<ModalState & ModalActions>((set) => ({
	...initialState,
	openModal: (props) =>
		set(() => ({
			...initialState,
			...props,
			visible: true,
		})),
	closeModal: () => set(() => ({ visible: false })),
	resetModalStore: () => set(() => initialState),
}));
