import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
	return (
		<header className={styles.header}>
			<nav className={styles.navbar}>
				<Link to="/" className={styles.title}>ethereal</Link>
				<ul className={styles.navbarNav}>
					<li className={styles.navItem}>
						<Link to="/dashboard" className={styles.navLink}>Войти</Link>
					</li>
				</ul>
			</nav>
		</header>
	)
}
