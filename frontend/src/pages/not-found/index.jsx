import React from 'react'
import { Link } from 'react-router-dom'
import styles from './index.module.css'

export default function NotFound() {
	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<span className={styles.code}>404</span>
				<h1 className={styles.title}>Страница не найдена</h1>
				<p className={styles.subtitle}>
					Такой страницы не существует или она была перемещена.
				</p>
				<Link to="/" className={styles.button}>
					На главную
				</Link>
			</div>
		</div>
	)
}
