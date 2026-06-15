import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useBoardsStore } from '../../shared/store/boardsStore'
import KanbanCard from './ui/KanbanCard'
import Task from './ui/Task'
import styles from './index.module.css'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

export default function Dashboard() {
	const board = useBoardsStore(state => state.boards.find(b => b.id === state.activeId) || null)
	const createTask = useBoardsStore(state => state.createTask)
	const deleteTask = useBoardsStore(state => state.deleteTask)
	const updateTask = useBoardsStore(state => state.updateTask)
	const [taskTitle, setTaskTitle] = useState('')
	const [openId, setOpenId] = useState(null)

	if (!board) {
		return <div className={styles.empty}>Создайте или выберите доску слева</div>
	}

	function submitTask(e) {
		e.preventDefault()
		const value = taskTitle.trim()
		if (!value) return
		createTask(value)
		setTaskTitle('')
	}

	const openTask = board.tasks.find(task => task.id === openId) || null

	return (
		<section className={styles.page}>
			<h2 className={styles.boardTitle}>{board.title}</h2>

			<form className={styles.createTask} onSubmit={submitTask}>
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
					const tasks = board.tasks.filter(task => task.status === status)
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
										onOpen={() => setOpenId(task.id)}
										onDelete={() => deleteTask(task.id)}
										onMove={status => updateTask(task.id, { status })}
									/>
								))}
							</div>
						</div>
					)
				})}
			</div>

			{openTask && (
				<div className={styles.overlay} onClick={() => setOpenId(null)}>
					<div className={styles.modal} onClick={e => e.stopPropagation()}>
						<Task
							task={openTask}
							onClose={() => setOpenId(null)}
							onChange={changes => updateTask(openTask.id, changes)}
						/>
					</div>
				</div>
			)}
		</section>
	)
}
