import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import styles from './KanbanCard.module.css'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

export default function KanbanCard({ task, onDelete, onMove }) {
	return (
		<div className={styles.card}>
			<div className={styles.top}>
				<span className={styles.uid}>#{task.uid}</span>
				<button className={styles.delete} onClick={onDelete} aria-label="Удалить задачу">
					<FontAwesomeIcon icon={faXmark} />
				</button>
			</div>
			<p className={styles.title}>{task.title}</p>
			{task.author_name && (
				<span className={styles.author}>{task.author_name}</span>
			)}
			<select
				className={styles.move}
				value={task.status}
				onChange={e => onMove(e.target.value)}
			>
				{STATUSES.map(status => (
					<option key={status} value={status}>{status}</option>
				))}
			</select>
		</div>
	)
}
