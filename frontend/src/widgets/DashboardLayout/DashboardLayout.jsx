import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import styles from './DashboardLayout.module.css'

let nextBoardId = 1
let nextTaskId = 1
let nextUid = 1001

export default function DashboardLayout() {
	const [boards, setBoards] = useState([])
	const [activeId, setActiveId] = useState(null)

	const active = boards.find(board => board.id === activeId) || null

	function createBoard(title) {
		const board = { id: nextBoardId++, title, tasks: [] }
		setBoards(prev => [...prev, board])
		setActiveId(board.id)
	}

	function deleteBoard(id) {
		setBoards(prev => prev.filter(board => board.id !== id))
		if (activeId === id) setActiveId(null)
	}

	function createTask(desc) {
		if (!active) return
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
		setBoards(prev =>
			prev.map(board =>
				board.id === active.id ? { ...board, tasks: [...board.tasks, task] } : board
			)
		)
	}

	function deleteTask(taskId) {
		setBoards(prev =>
			prev.map(board =>
				board.id === active.id
					? { ...board, tasks: board.tasks.filter(task => task.id !== taskId) }
					: board
			)
		)
	}

	function updateTask(taskId, changes) {
		setBoards(prev =>
			prev.map(board =>
				board.id === active.id
					? {
							...board,
							tasks: board.tasks.map(task =>
								task.id === taskId
									? { ...task, ...changes, updated_at: new Date().toISOString() }
									: task
							),
					  }
					: board
			)
		)
	}

	return (
		<div className="app">
			<Header />
			<div className={styles.body}>
				<Sidebar
					boards={boards}
					activeId={activeId}
					onCreate={createBoard}
					onSelect={setActiveId}
					onDelete={deleteBoard}
				/>
				<main className={styles.main}>
					<Outlet context={{ board: active, createTask, deleteTask, updateTask }} />
				</main>
			</div>
		</div>
	)
}
