import { create } from 'zustand'

let sequence = 0
export const useToastStore = create(set => ({
	items: [],
	remove: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
}))
export function toast(message, type = 'success') {
	const id = ++sequence
	useToastStore.setState(state => ({ items: [...state.items.slice(-3), { id, message, type }] }))
	setTimeout(() => useToastStore.getState().remove(id), type === 'error' ? 8000 : 4000)
}
