import { create } from 'zustand'

let nextBoardId = 1
let nextTaskId = 1
let nextUid = 1001

export const useBoardsStore = create((set, get) => ({
	boards: [],
	activeId: null,

	getActive: () => get().boards.find(board => board.id === get().activeId) || null,

	createBoard: title =>
		set(state => {
			const board = { id: nextBoardId++, title, tasks: [] }
			return { boards: [...state.boards, board], activeId: board.id }
		}),

	deleteBoard: id =>
		set(state => ({
			boards: state.boards.filter(board => board.id !== id),
			activeId: state.activeId === id ? null : state.activeId,
		})),

	selectBoard: id => set({ activeId: id }),

	createTask: desc =>
		set(state => {
			if (!state.activeId) return state
			const now = new Date().toISOString()
			const task = {
				id: nextTaskId++,
				uid: String(nextUid++),
				desc,
				additional_desc: '',
				status: 'Открыта',
				tags: [],
				author_name: 'Я',
				assignee_name: null,
				created_at: now,
				updated_at: now,
			}
			return {
				boards: state.boards.map(board =>
					board.id === state.activeId ? { ...board, tasks: [...board.tasks, task] } : board
				),
			}
		}),

	deleteTask: taskId =>
		set(state => ({
			boards: state.boards.map(board =>
				board.id === state.activeId
					? { ...board, tasks: board.tasks.filter(task => task.id !== taskId) }
					: board
			),
		})),

	updateTask: (taskId, changes) =>
		set(state => ({
			boards: state.boards.map(board =>
				board.id === state.activeId
					? {
							...board,
							tasks: board.tasks.map(task =>
								task.id === taskId
									? { ...task, ...changes, updated_at: new Date().toISOString() }
									: task
							),
					  }
					: board
			),
		})),
}))
