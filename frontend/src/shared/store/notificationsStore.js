import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange } from '../api/client'
import { reconcile } from '../lib/reconcile'

let requestId = 0
export const useNotificationsStore = create((set, get) => ({
	items: [], unreadCount: 0, nextCursor: null, error: '',
	load: async (more = false) => {
		const session = getSessionVersion()
		const request = ++requestId
		try {
			const cursor = more ? get().nextCursor : null
			const data = await api(`/notifications${cursor ? `?before=${cursor}` : ''}`, { silent: true })
			if (session !== getSessionVersion() || request !== requestId) return
			set(state => ({ items: reconcile(state.items, more ? [...state.items, ...data.items.filter(item => !state.items.some(old => old.id === item.id))] : data.items), unreadCount: data.unread_count, nextCursor: data.next_cursor, error: '' }))
		} catch (error) {
			if (session === getSessionVersion() && request === requestId) set({ error: error.message })
		}
	},
	read: async id => { await api(`/notifications/${id}/read`, { method: 'POST' }); await get().load() },
	readAll: async () => { await api('/notifications/read-all', { method: 'POST' }); await get().load() },
}))
onSessionChange(() => { requestId += 1; useNotificationsStore.setState({ items: [], unreadCount: 0, nextCursor: null, error: '' }) })
