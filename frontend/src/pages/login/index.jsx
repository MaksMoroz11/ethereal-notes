import React from 'react'
import Task from './ui/Task'
import styles from './index.module.css'

const task = {
	uid: '44025',
	desc: 'Secondary sort criteria ignored when "Parent task" is the first criterion',
	additional_desc:
		'Indented child tickets require "Parent task" as the first sort criterion. This breaks all following sort rules. Secondary criteria (priority and project) are ignored — tickets sort only by ticket ID descending instead.',
	created_at: '2026-05-06T09:16:00Z',
	updated_at: '2026-05-06T09:16:00Z',
	author_name: 'Boris Brodski',
	tags: ['DEV', 'BUG'],
}

export default function Login() {
	return (
		<section className={styles.page}>
			<div className={styles.container}>
				<Task task={task} />
			</div>
		</section>
	)
}
