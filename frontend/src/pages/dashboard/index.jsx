import React, { useState } from 'react'
import Task from './ui/Task'
import styles from './index.module.css'

const task = {
	uid: '44025',
	desc: 'Secondary sort criteria ignored when "Parent task" is the first criterion',
	additional_desc:
		'Indented child tickets require "Parent task" as the first sort criterion. This breaks all following sort rules. Secondary criteria (priority and project) are ignored — tickets sort only by ticket ID descending instead.',
	created_at: '2026-05-06T09:16:00Z',
	updated_at: '2026-05-07T14:03:00Z',
	author_name: 'Boris Brodski',
	assignee_name: 'Anna Kovaleva',
	status: 'В работе',
	tags: ['DEV', 'BUG'],
}

export default function Dashboard() {
	const [open, setOpen] = useState(true)

	return (
		<section className={styles.page}>
			<div className={styles.container}>
				{open ? (
					<Task task={task} onClose={() => setOpen(false)} />
				) : (
					<button className={styles.reopen} onClick={() => setOpen(true)}>
						Открыть задачу #{task.uid}
					</button>
				)}
			</div>
		</section>
	)
}
