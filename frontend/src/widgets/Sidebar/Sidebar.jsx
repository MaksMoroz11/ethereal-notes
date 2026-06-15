import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import styles from './Sidebar.module.css'

export default function Sidebar({ boards, activeId, onCreate, onSelect, onDelete }) {
	const [adding, setAdding] = useState(false)
	const [title, setTitle] = useState('')

	function submit(e) {
		e.preventDefault()
		const value = title.trim()
		if (!value) return
		onCreate(value)
		setTitle('')
		setAdding(false)
	}

	return (
		<aside className={styles.sidebar}>
			{adding ? (
				<form className={styles.createForm} onSubmit={submit}>
					<input
						className={styles.input}
						placeholder="Название доски"
						value={title}
						autoFocus
						onChange={e => setTitle(e.target.value)}
						onBlur={() => !title.trim() && setAdding(false)}
					/>
				</form>
			) : (
				<button className={styles.createButton} onClick={() => setAdding(true)}>
					<FontAwesomeIcon icon={faPlus} className={styles.icon} />
					Создать доску
				</button>
			)}
			<div className={styles.divider} />
			<ul className={styles.list}>
				{boards.map(board => (
					<li
						key={board.id}
						className={`${styles.item} ${board.id === activeId ? styles.itemActive : ''}`}
						onClick={() => onSelect(board.id)}
					>
						<span className={styles.itemTitle}>{board.title}</span>
						<button
							className={styles.itemDelete}
							onClick={e => {
								e.stopPropagation()
								onDelete(board.id)
							}}
							aria-label="Удалить доску"
						>
							<FontAwesomeIcon icon={faTrash} />
						</button>
					</li>
				))}
			</ul>
		</aside>
	)
}
