import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import KanbanCard from './ui/KanbanCard'
import styles from './index.module.css'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

let nextBoardId = 1
let nextTaskId = 1
let nextUid = 1001

export default function Dashboard() {
	const [boards, setBoards] = useState([])
	const [activeId, setActiveId] = useState(null)
	const [boardTitle, setBoardTitle] = useState('')
	const [taskTitle, setTaskTitle] = useState('')

	const active = boards.find(board => board.id === activeId) || null

	function createBoard(e) {
		e.preventDefault()
		const title = boardTitle.trim()
		if (!title) return
		const board = { id: nextBoardId++, title, tasks: [] }
		setBoards(prev => [...prev, board])
		setActiveId(board.id)
		setBoardTitle('')
	}

	function deleteBoard(id) {
		setBoards(prev => prev.filter(board => board.id !== id))
		if (activeId === id) setActiveId(null)
	}

	function createTask(e) {
		e.preventDefault()
		const title = taskTitle.trim()
		if (!title || !active) return
		const task = {
			id: nextTaskId++,
			uid: String(nextUid++),
			title,
			status: 'Открыта',
			author_name: 'Я',
		}
		setBoards(prev =>
			prev.map(board =>
				board.id === active.id ? { ...board, tasks: [...board.tasks, task] } : board
			)
		)
		setTaskTitle('')
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

	function moveTask(taskId, status) {
		setBoards(prev =>
			prev.map(board =>
				board.id === active.id
					? {
							...board,
							tasks: board.tasks.map(task =>
								task.id === taskId ? { ...task, status } : task
							),
					  }
					: board
			)
		)
	}

	return (
		<section className={styles.page}>
			<div className={styles.boardsBar}>
				<form className={styles.createBoard} onSubmit={createBoard}>
					<input
						className={styles.input}
						placeholder="Название доски"
						value={boardTitle}
						onChange={e => setBoardTitle(e.target.value)}
					/>
					<button type="submit" className={styles.addBoard}>
						<FontAwesomeIcon icon={faPlus} />
					</button>
				</form>
				<div className={styles.tabs}>
					{boards.map(board => (
						<div
							key={board.id}
							className={`${styles.tab} ${board.id === activeId ? styles.tabActive : ''}`}
							onClick={() => setActiveId(board.id)}
						>
							<span>{board.title}</span>
							<button
								className={styles.tabDelete}
								onClick={e => {
									e.stopPropagation()
									deleteBoard(board.id)
								}}
								aria-label="Удалить доску"
							>
								<FontAwesomeIcon icon={faTrash} />
							</button>
						</div>
					))}
				</div>
			</div>

			{active ? (
				<div className={styles.board}>
					<form className={styles.createTask} onSubmit={createTask}>
						<input
							className={styles.input}
							placeholder="Новая задача"
							value={taskTitle}
							onChange={e => setTaskTitle(e.target.value)}
						/>
						<button type="submit" className={styles.addTask}>
							<FontAwesomeIcon icon={faPlus} className={styles.icon} />
							Добавить
						</button>
					</form>

					<div className={styles.columns}>
						{STATUSES.map(status => {
							const tasks = active.tasks.filter(task => task.status === status)
							return (
								<div key={status} className={styles.column}>
									<div className={styles.columnHead}>
										<span>{status}</span>
										<span className={styles.count}>{tasks.length}</span>
									</div>
									<div className={styles.columnBody}>
										{tasks.map(task => (
											<KanbanCard
												key={task.id}
												task={task}
												onDelete={() => deleteTask(task.id)}
												onMove={status => moveTask(task.id, status)}
											/>
										))}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			) : (
				<div className={styles.empty}>
					{boards.length ? 'Выберите доску' : 'Создайте первую доску'}
				</div>
			)}
		</section>
	)
}
