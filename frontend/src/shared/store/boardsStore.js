import { create } from 'zustand'
import { api } from '../api/client'

export const useBoardsStore = create((set, get) => ({
	boards: [],
	activeId: null,
	loading: false,

	loadBoards: async () => {
		set({ loading: true })
		try {
			const boards = await api('/boards')
			set(state => ({
				boards,
				activeId: boards.some(b => b.id === state.activeId)
					? state.activeId
					: boards[0]?.id ?? null,
			}))
		} finally {
			set({ loading: false })
		}
	},

	createBoard: async title => {
		const board = await api('/boards', { method: 'POST', body: { title } })
		set(state => ({ boards: [...state.boards, { ...board, tasks: [] }], activeId: board.id }))
	},

	deleteBoard: async id => {
		await api(`/boards/${id}`, { method: 'DELETE' })
		set(state => ({
			boards: state.boards.filter(board => board.id !== id),
			activeId: state.activeId === id ? null : state.activeId,
		}))
	},

	selectBoard: id => set({ activeId: id }),

	createTask: async title => {
		const boardId = get().activeId
		if (!boardId) return
		const task = await api('/tasks', { method: 'POST', body: { board_id: boardId, title } })
		set(state => ({
			boards: state.boards.map(board =>
				board.id === boardId ? { ...board, tasks: [...board.tasks, task] } : board
			),
		}))
	},

	deleteTask: async taskId => {
		const boardId = get().activeId
		await api(`/tasks/${taskId}`, { method: 'DELETE' })
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
		const task = await api(`/tasks/${taskId}`, { method: 'PATCH', body: changes })
		set(state => ({
			boards: state.boards.map(board =>
				board.id === boardId
					? { ...board, tasks: board.tasks.map(t => (t.id === taskId ? task : t)) }
					: board
			),
		}))
	},
}))
