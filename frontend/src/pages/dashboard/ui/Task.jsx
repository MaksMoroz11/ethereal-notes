import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
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

const STATUS_STYLES = {
	'Открыта':     { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
	'В работе':    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
	'На проверке': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
	'Готово':      { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
}

export default function Task({ task, onClose, onChange }) {
	const isBug = task.tags.includes('BUG')
	const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES['Открыта']

	const [desc, setDesc] = useState(task.desc)
	const [additionalDesc, setAdditionalDesc] = useState(task.additional_desc)
	const [editingDesc, setEditingDesc] = useState(false)
	const [editingAdditional, setEditingAdditional] = useState(false)

	function saveDesc() {
		setEditingDesc(false)
		if (onChange && desc !== task.desc) onChange({ desc })
	}

	function saveAdditional() {
		setEditingAdditional(false)
		if (onChange && additionalDesc !== task.additional_desc) onChange({ additional_desc: additionalDesc })
	}

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<span className={styles.uid}>#{task.uid}</span>
				<div className={styles.badges}>
					{isBug && (
						<span className={styles.bugBadge}>
							<span className={styles.bugDot} />
							bug
						</span>
					)}
					{task.status && (
						<span
							className={styles.statusBadge}
							style={{ color: statusStyle.color, backgroundColor: statusStyle.bg, borderColor: statusStyle.border }}
						>
							{task.status}
						</span>
					)}
				</div>
				{onClose && (
					<button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
						<FontAwesomeIcon icon={faXmark} />
					</button>
				)}
			</div>

			<div className={styles.divider} />

			{editingDesc ? (
				<input
					className={styles.titleInput}
					value={desc}
					autoFocus
					onChange={e => setDesc(e.target.value)}
					onBlur={saveDesc}
					onKeyDown={e => e.key === 'Enter' && e.target.blur()}
				/>
			) : (
				<h3 className={`${styles.title} ${styles.titleEditable}`} onClick={() => setEditingDesc(true)}>
					{desc}
				</h3>
			)}

			{editingAdditional ? (
				<textarea
					className={styles.descTextarea}
					value={additionalDesc}
					autoFocus
					onChange={e => setAdditionalDesc(e.target.value)}
					onBlur={saveAdditional}
				/>
			) : (
				<p className={`${styles.desc} ${styles.descEditable}`} onClick={() => setEditingAdditional(true)}>
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
				<div className={styles.people}>
					<div className={styles.person}>
						<span className={styles.metaLabel}>автор</span>
						<div className={styles.author}>
							<div className={styles.avatar}>{getInitials(task.author_name)}</div>
							<span className={styles.authorName}>{task.author_name}</span>
						</div>
					</div>
					{task.assignee_name && (
						<div className={styles.person}>
							<span className={styles.metaLabel}>назначено</span>
							<div className={styles.author}>
								<div className={`${styles.avatar} ${styles.avatarAssignee}`}>{getInitials(task.assignee_name)}</div>
								<span className={styles.authorName}>{task.assignee_name}</span>
							</div>
						</div>
					)}
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
