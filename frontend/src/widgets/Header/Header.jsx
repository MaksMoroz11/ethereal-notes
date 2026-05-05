import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
	return (
		<header className={styles.header}>
			<nav className={styles.navbar}>
				<h3 className={styles.title}>ethereal</h3>
				<ul className={styles.navbarNav}>
					<li className={styles.navItem}>
						<Link to="/login" className={styles.navLink}>Войти</Link>
					</li>
				</ul>
			</nav>
		</header>
	)
}
