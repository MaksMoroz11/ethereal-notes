import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange } from '../api/client'
import { useWorkspaceStore, workspaceRequestIsCurrent } from './workspaceStore'

let requests = { board: 0, document: 0 }
export const useFoldersStore = create(set => ({
	boardFolders: [],
	documentFolders: [],
	error: '',
	loadFolders: async (workspaceId, kind = 'board') => {
		const id = workspaceId ?? useWorkspaceStore.getState().activeId
		const key = kind === 'document' ? 'documentFolders' : 'boardFolders'
		const request = ++requests[kind]
		const session = getSessionVersion()
		if (!id) return set({ [key]: [] })
		try {
			const folders = await api(`/folders?workspace_id=${id}&kind=${kind}`)
			if (request === requests[kind] && workspaceRequestIsCurrent(id, session)) set({ [key]: folders, error: '' })
		} catch (error) {
			if (request !== requests[kind] || !workspaceRequestIsCurrent(id, session)) return
			set({ error: error.message })
			throw error
		}
	},
	createFolder: async (title, parentId = null, kind = 'board') => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		const folder = await api('/folders', { method: 'POST', body: { title, parent_id: parentId, workspace_id: workspaceId, kind } })
		const key = kind === 'document' ? 'documentFolders' : 'boardFolders'
		if (workspaceRequestIsCurrent(workspaceId, session)) set(state => ({ [key]: [...state[key], folder] }))
		return folder
	},
	updateFolder: async (id, changes) => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		const folder = await api(`/folders/${id}`, { method: 'PATCH', body: changes })
		const key = folder.kind === 'document' ? 'documentFolders' : 'boardFolders'
		if (workspaceRequestIsCurrent(workspaceId, session)) set(state => ({ [key]: state[key].map(item => item.id === id ? folder : item) }))
	},
	deleteFolder: async id => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		await api(`/folders/${id}`, { method: 'DELETE' })
		if (workspaceRequestIsCurrent(workspaceId, session)) set(state => ({ boardFolders: state.boardFolders.filter(item => item.id !== id), documentFolders: state.documentFolders.filter(item => item.id !== id) }))
	},
}))

function reset() {
	requests = { board: requests.board + 1, document: requests.document + 1 }
	useFoldersStore.setState({ boardFolders: [], documentFolders: [], error: '' })
}
onSessionChange(reset)
useWorkspaceStore.subscribe((state, previous) => { if (state.activeId !== previous.activeId) reset() })
