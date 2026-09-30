import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange } from '../api/client'
import { useWorkspaceStore, workspaceRequestIsCurrent } from './workspaceStore'
import { useAuthStore } from './authStore'

export const useBoardsStore = create((set, get) => ({
	boards: [],
	activeId: null,
	workspaceId: null,
	view: 'self',
	loading: false,
	error: '',
	loadRequestId: 0,

	loadBoards: async workspaceId => {
		const id = workspaceId ?? useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		if (id !== get().workspaceId) set({ workspaceId: id, view: 'self', boards: [], activeId: null })
		const requestId = get().loadRequestId + 1
		set({ loading: true, error: '', loadRequestId: requestId })
		try {
			if (!id) {
				set({ boards: [], activeId: null })
				return
			}
			const view = get().view
			const filter = view === 'all' ? '&all_tasks=true' : view === 'self' ? '' : `&assignee_id=${view}`
			const boards = await api(`/boards?workspace_id=${id}${filter}`)
			if (requestId !== get().loadRequestId || get().view !== view || !workspaceRequestIsCurrent(id, session)) return
			set(state => ({
				boards,
				activeId: boards.some(b => b.id === state.activeId)
					? state.activeId
					: boards[0]?.id ?? null,
			}))
		} catch (error) {
			if (requestId !== get().loadRequestId || !workspaceRequestIsCurrent(id, session)) return
			set({ error: error.message })
			throw error
		} finally {
			if (requestId === get().loadRequestId) set({ loading: false })
		}
	},

	setView: async view => {
		set({ view })
		await get().loadBoards()
	},

	createBoard: async (title, folderId = null) => {
		const workspaceId = useWorkspaceStore.getState().activeId
		const session = getSessionVersion()
		if (!workspaceId) return
		const board = await api('/boards', { method: 'POST', body: { title, workspace_id: workspaceId, folder_id: folderId } })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		set(state => ({ boards: [...state.boards, { ...board, tasks: [] }], activeId: board.id }))
	},

	deleteBoard: async id => {
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		await api(`/boards/${id}`, { method: 'DELETE' })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		set(state => ({
			boards: state.boards.filter(board => board.id !== id),
			activeId: state.activeId === id ? null : state.activeId,
		}))
	},

	selectBoard: id => set({ activeId: id }),
	moveBoard: async (id, folderId) => {
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		const board = await api(`/boards/${id}`, { method: 'PATCH', body: { folder_id: folderId } })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		set(state => ({ boards: state.boards.map(item => item.id === id ? { ...item, folder_id: board.folder_id } : item) }))
	},
	createColumn: async title => {
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		await api(`/boards/${get().activeId}/columns`, { method: 'POST', body: { title } })
		if (workspaceRequestIsCurrent(workspaceId, session)) await get().loadBoards(workspaceId)
	},
	updateColumn: async (id, changes) => {
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		await api(`/boards/${get().activeId}/columns/${id}`, { method: 'PATCH', body: changes })
		if (workspaceRequestIsCurrent(workspaceId, session)) await get().loadBoards(workspaceId)
	},
	deleteColumn: async (id, targetId = null, deleteTasks = false) => {
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		const params = new URLSearchParams()
		if (targetId) params.set('target_column_id', targetId)
		if (deleteTasks) params.set('delete_tasks', 'true')
		const query = params.size ? `?${params.toString()}` : ''
		await api(`/boards/${get().activeId}/columns/${id}${query}`, { method: 'DELETE' })
		if (workspaceRequestIsCurrent(workspaceId, session)) await get().loadBoards(workspaceId)
	},

	createTask: async (title, columnId = null) => {
		const boardId = get().activeId
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		if (!boardId) return
		const board = get().boards.find(item => item.id === boardId)
		const selectedColumnId = columnId ?? board?.columns[0]?.id
		if (!selectedColumnId) throw new Error('Сначала создайте колонку')
		const view = get().view
		const assigneeId = view !== 'all' && view !== 'self' ? Number(view) : useAuthStore.getState().user?.id
		const task = await api('/tasks', { method: 'POST', body: { board_id: boardId, column_id: selectedColumnId, title, assignee_id: assigneeId } })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		if (view !== get().view) { await get().loadBoards(workspaceId); return }
		set(state => ({
			boards: state.boards.map(board =>
				board.id === boardId ? { ...board, tasks: [...board.tasks, task] } : board
			),
		}))
	},

	deleteTask: async taskId => {
		const boardId = get().activeId
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		await api(`/tasks/${taskId}`, { method: 'DELETE' })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		set(state => ({
			boards: state.boards.map(board =>
				board.id === boardId
					? { ...board, tasks: board.tasks.filter(task => task.id !== taskId) }
					: board
			),
		}))
	},

	updateTask: async (taskId, changes) => {
		const boardId = get().activeId
		const workspaceId = get().workspaceId
		const session = getSessionVersion()
		const viewAtRequest = get().view
		const task = await api(`/tasks/${taskId}`, { method: 'PATCH', body: changes })
		if (!workspaceRequestIsCurrent(workspaceId, session)) return
		const view = get().view
		if (view !== viewAtRequest) {
			await get().loadBoards()
			return
		}
		const selectedId = view === 'self' ? useAuthStore.getState().user?.id : Number(view)
		const visible = view === 'all' || task.assignee_id === selectedId
		set(state => ({
			boards: state.boards.map(board =>
				board.id === boardId
					? { ...board, tasks: board.tasks.map(t => (t.id === taskId ? task : t)).filter(t => t.id !== taskId || visible) }
					: board
			),
		}))
	},
}))

function reset() {
	useBoardsStore.setState(state => ({ boards: [], activeId: null, workspaceId: null, view: 'self', loading: false, error: '', loadRequestId: state.loadRequestId + 1 }))
}
onSessionChange(reset)
useWorkspaceStore.subscribe((state, previous) => { if (state.activeId !== previous.activeId) reset() })
