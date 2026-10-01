import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange } from '../api/client'
import { useWorkspaceStore, workspaceRequestIsCurrent } from './workspaceStore'
import { useBoardsStore } from './boardsStore'
import { useDocumentsStore } from './documentsStore'
import { folderSubtree } from '../lib/folderTree'

let requests = { board: 0, document: 0 }
export const useFoldersStore = create((set, get) => ({
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
	deleteFolder: async (id, recursive = false) => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		const ids = folderSubtree([...get().boardFolders, ...get().documentFolders], id)
		await api(`/folders/${id}${recursive ? '?recursive=true' : ''}`, { method: 'DELETE' })
		useDocumentsStore.getState().removeDocumentsInFolders(ids)
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		requests.board += 1
		requests.document += 1
		set(state => ({ boardFolders: state.boardFolders.filter(item => !ids.has(item.id)), documentFolders: state.documentFolders.filter(item => !ids.has(item.id)) }))
		useBoardsStore.setState(state => {
			const boards = state.boards.filter(board => !ids.has(board.folder_id))
			return { boards, activeId: boards.some(board => board.id === state.activeId) ? state.activeId : boards[0]?.id ?? null, loadRequestId: state.loadRequestId + 1, loading: false }
		})
	},
}))

function reset() {
	requests = { board: requests.board + 1, document: requests.document + 1 }
	useFoldersStore.setState({ boardFolders: [], documentFolders: [], error: '' })
}
onSessionChange(reset)
useWorkspaceStore.subscribe((state, previous) => { if (state.activeId !== previous.activeId) reset() })
