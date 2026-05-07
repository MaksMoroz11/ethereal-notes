import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import styles from './Sidebar.module.css'

export default function Sidebar() {
	return (
		<aside className={styles.sidebar}>
			<button className={styles.createButton}>
				<FontAwesomeIcon icon={faPlus} className={styles.icon} />
				Создать доску
			</button>
			<div className={styles.divider} />
		</aside>
	)
}
