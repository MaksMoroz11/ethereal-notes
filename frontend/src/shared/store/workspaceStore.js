import { create } from 'zustand'
import { api } from '../api/client'

export const useWorkspaceStore = create((set, get) => ({
	workspaces: [],
	activeId: null,
	members: [],
	inviteError: '',

	loadWorkspaces: async () => {
		const workspaces = await api('/workspaces')
		set(state => ({
			workspaces,
			activeId: workspaces.some(item => item.id === state.activeId)
				? state.activeId
				: workspaces[0]?.id ?? null,
		}))
		const activeId = get().activeId
		if (activeId) await get().loadMembers(activeId)
	},

	selectWorkspace: async id => {
		set({ activeId: id, inviteError: '' })
		await get().loadMembers(id)
	},

	createWorkspace: async name => {
		const workspace = await api('/workspaces', { method: 'POST', body: { name } })
		set(state => ({ workspaces: [...state.workspaces, workspace], activeId: workspace.id }))
		await get().loadMembers(workspace.id)
		return workspace
	},

	renameWorkspace: async name => {
		const id = get().activeId
		if (!id) return
		const workspace = await api(`/workspaces/${id}`, { method: 'PATCH', body: { name } })
		set(state => ({
			workspaces: state.workspaces.map(item => (item.id === id ? workspace : item)),
		}))
	},

	deleteWorkspace: async () => {
		const id = get().activeId
		if (!id) return
		await api(`/workspaces/${id}`, { method: 'DELETE' })
		const remaining = get().workspaces.filter(item => item.id !== id)
		const nextId = remaining[0]?.id ?? null
		set({ workspaces: remaining, activeId: nextId, members: [], inviteError: '' })
		if (nextId) await get().loadMembers(nextId)
	},

	loadMembers: async workspaceId => {
		const id = workspaceId ?? get().activeId
		if (!id) {
			set({ members: [] })
			return
		}
		const members = await api(`/workspaces/${id}/members`)
		set({ members })
	},

	inviteMember: async login => {
		const id = get().activeId
		if (!id) return
		set({ inviteError: '' })
		try {
			const member = await api(`/workspaces/${id}/members`, { method: 'POST', body: { login } })
			set(state => ({ members: [...state.members, member] }))
		} catch (err) {
			set({ inviteError: err.message })
			throw err
		}
	},

	removeMember: async userId => {
		const id = get().activeId
		if (!id) return
		await api(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' })
		set(state => ({ members: state.members.filter(item => item.user_id !== userId) }))
	},

	updateMemberRole: async (userId, role) => {
		const id = get().activeId
		if (!id) return
		const member = await api(`/workspaces/${id}/members/${userId}`, {
			method: 'PATCH',
			body: { role },
		})
		set(state => ({
			members: state.members.map(item => (item.user_id === userId ? member : item)),
		}))
	},
}))
