import { create } from 'zustand'
import { api } from '../api/client'
import { useWorkspaceStore } from './workspaceStore'

export const useFoldersStore = create(set => ({
	boardFolders: [],
	documentFolders: [],
	loadFolders: async (workspaceId, kind = 'board') => {
		const id = workspaceId ?? useWorkspaceStore.getState().activeId
		const key = kind === 'document' ? 'documentFolders' : 'boardFolders'
		if (!id) return set({ [key]: [] })
		const folders = await api(`/folders?workspace_id=${id}&kind=${kind}`)
		set({ [key]: folders })
	},
	createFolder: async (title, parentId = null, kind = 'board') => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const folder = await api('/folders', { method: 'POST', body: { title, parent_id: parentId, workspace_id: workspaceId, kind } })
		const key = kind === 'document' ? 'documentFolders' : 'boardFolders'
		set(state => ({ [key]: [...state[key], folder] }))
		return folder
	},
	updateFolder: async (id, changes) => {
		const folder = await api(`/folders/${id}`, { method: 'PATCH', body: changes })
		const key = folder.kind === 'document' ? 'documentFolders' : 'boardFolders'
		set(state => ({ [key]: state[key].map(item => item.id === id ? folder : item) }))
	},
	deleteFolder: async id => {
		await api(`/folders/${id}`, { method: 'DELETE' })
		set(state => ({
			boardFolders: state.boardFolders.filter(item => item.id !== id),
			documentFolders: state.documentFolders.filter(item => item.id !== id),
		}))
	},
}))
