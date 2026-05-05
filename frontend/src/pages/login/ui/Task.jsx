import React, { useState } from 'react'
import styles from './Task.module.css'

function getInitials(name) {
	return name
		.split(' ')
		.map(part => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

function formatDate(iso) {
	return new Date(iso).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

export default function Task({ task }) {
	const isBug = task.tags.includes('BUG')

	const [desc, setDesc] = useState(task.desc)
	const [additionalDesc, setAdditionalDesc] = useState(task.additional_desc)
	const [editingDesc, setEditingDesc] = useState(false)
	const [editingAdditional, setEditingAdditional] = useState(false)

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<span className={styles.uid}>#{task.uid}</span>
				{isBug && (
					<span className={styles.bugBadge}>
						<span className={styles.bugDot} />
						bug
					</span>
				)}
			</div>

			<div className={styles.divider} />

			{editingDesc ? (
				<input
					className={styles.titleInput}
					value={desc}
					autoFocus
					onChange={e => setDesc(e.target.value)}
					onBlur={() => setEditingDesc(false)}
					onKeyDown={e => e.key === 'Enter' && e.target.blur()}
				/>
			) : (
				<h3 className={`${styles.title} ${styles.editable}`} onClick={() => setEditingDesc(true)}>
					{desc}
				</h3>
			)}

			{editingAdditional ? (
				<textarea
					className={styles.descTextarea}
					value={additionalDesc}
					autoFocus
					onChange={e => setAdditionalDesc(e.target.value)}
					onBlur={() => setEditingAdditional(false)}
				/>
			) : (
				<p className={`${styles.desc} ${styles.editable}`} onClick={() => setEditingAdditional(true)}>
					{additionalDesc || <span className={styles.placeholder}>Добавить описание…</span>}
				</p>
			)}

			<div className={styles.tags}>
				{task.tags.map(tag => (
					<span key={tag} className={styles.tag}>
						{tag}
					</span>
				))}
			</div>

			<div className={styles.footer}>
				<div className={styles.author}>
					<div className={styles.avatar}>{getInitials(task.author_name)}</div>
					<span className={styles.authorName}>{task.author_name}</span>
				</div>

				<div className={styles.meta}>
					<span className={styles.metaRow}>
						<span className={styles.metaLabel}>создано</span>
						{formatDate(task.created_at)}
					</span>
					<span className={styles.metaRow}>
						<span className={styles.metaLabel}>обновлено</span>
						{formatDate(task.updated_at)}
					</span>
				</div>
			</div>
		</div>
	)
}
