import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange } from '../api/client'

let workspaceRequest = 0
let memberRequest = 0
const initial = { workspaces: [], activeId: null, members: [], inviteError: '', error: '', activityRevision: 0 }

export const useWorkspaceStore = create((set, get) => ({
	...initial,
	loadWorkspaces: async () => {
		const request = ++workspaceRequest
		const session = getSessionVersion()
		set({ error: '' })
		try {
			const workspaces = await api('/workspaces')
			if (request !== workspaceRequest || session !== getSessionVersion()) return
			set(state => ({ workspaces, activeId: workspaces.some(item => item.id === state.activeId) ? state.activeId : workspaces[0]?.id ?? null }))
			await get().loadMembers()
		} catch (error) {
			if (request !== workspaceRequest || session !== getSessionVersion()) return
			set({ error: error.message })
			throw error
		}
	},
	selectWorkspace: async id => {
		set({ activeId: id, members: [], inviteError: '', error: '', activityRevision: 0 })
		await get().loadMembers(id)
	},
	createWorkspace: async name => {
		const previousId = get().activeId
		const workspace = await api('/workspaces', { method: 'POST', body: { name } })
		set(state => ({ workspaces: [...state.workspaces, workspace], activeId: state.activeId === previousId ? workspace.id : state.activeId }))
		await get().loadMembers()
		return workspace
	},
	renameWorkspace: async name => {
		const id = get().activeId
		if (!id) return
		const workspace = await api(`/workspaces/${id}`, { method: 'PATCH', body: { name } })
		set(state => ({ workspaces: state.workspaces.map(item => item.id === id ? workspace : item) }))
	},
	deleteWorkspace: async () => {
		const id = get().activeId
		if (!id) return
		await api(`/workspaces/${id}`, { method: 'DELETE' })
		const remaining = get().workspaces.filter(item => item.id !== id)
		set({ workspaces: remaining, activeId: get().activeId === id ? remaining[0]?.id ?? null : get().activeId, inviteError: '' })
		await get().loadMembers()
	},
	loadMembers: async workspaceId => {
		const id = workspaceId ?? get().activeId
		const request = ++memberRequest
		const session = getSessionVersion()
		set({ members: [] })
		if (!id) return
		try {
			const members = await api(`/workspaces/${id}/members`)
			if (request === memberRequest && workspaceRequestIsCurrent(id, session)) set({ members })
		} catch (error) {
			if (request !== memberRequest || !workspaceRequestIsCurrent(id, session)) return
			set({ error: error.message })
			throw error
		}
	},
	inviteMember: async login => {
		const id = get().activeId
		const session = getSessionVersion()
		if (!id) return
		set({ inviteError: '' })
		try {
			const member = await api(`/workspaces/${id}/members`, { method: 'POST', body: { login } })
			if (workspaceRequestIsCurrent(id, session)) set(state => ({ members: [...state.members.filter(item => item.user_id !== member.user_id), member] }))
		} catch (error) {
			if (workspaceRequestIsCurrent(id, session)) set({ inviteError: error.message })
			throw error
		}
	},
	removeMember: async userId => {
		const id = get().activeId
		const session = getSessionVersion()
		if (!id) return
		await api(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' })
		if (workspaceRequestIsCurrent(id, session)) set(state => ({ members: state.members.filter(item => item.user_id !== userId) }))
	},
	updateMemberRole: async (userId, role) => {
		const id = get().activeId
		const session = getSessionVersion()
		if (!id) return
		const member = await api(`/workspaces/${id}/members/${userId}`, { method: 'PATCH', body: { role } })
		if (workspaceRequestIsCurrent(id, session)) set(state => ({ members: state.members.map(item => item.user_id === userId ? member : item) }))
	},
}))

export function workspaceRequestIsCurrent(id, session) {
	return id === useWorkspaceStore.getState().activeId && session === getSessionVersion()
}

onSessionChange(() => {
	workspaceRequest += 1
	memberRequest += 1
	useWorkspaceStore.setState(initial)
})
