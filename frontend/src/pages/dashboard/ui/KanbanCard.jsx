import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import styles from './KanbanCard.module.css'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

export default function KanbanCard({ task, onOpen, onDelete, onMove }) {
	return (
		<div className={styles.card} onClick={onOpen}>
			<div className={styles.top}>
				<span className={styles.uid}>#{task.uid}</span>
				<button
					className={styles.delete}
					onClick={e => {
						e.stopPropagation()
						onDelete()
					}}
					aria-label="Удалить задачу"
				>
					<FontAwesomeIcon icon={faXmark} />
				</button>
			</div>
			<p className={styles.title}>{task.title}</p>
			<select
				className={styles.move}
				value={task.status}
				onClick={e => e.stopPropagation()}
				onChange={e => onMove(e.target.value)}
			>
				{STATUSES.map(status => (
					<option key={status} value={status}>{status}</option>
				))}
			</select>
		</div>
	)
}
