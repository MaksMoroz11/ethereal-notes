import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import styles from './Header.module.css'

export default function Header() {
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
		localStorage.setItem('theme', theme)
	}, [theme])

	function toggleTheme() {
		setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
	}

	return (
		<header className={styles.header}>
			<nav className={styles.navbar}>
				<Link to="/" className={styles.title}>ethereal</Link>
				<ul className={styles.navbarNav}>
					<li className={styles.navItem}>
						<button className={styles.themeButton} onClick={toggleTheme} aria-label="Сменить тему">
							<FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
						</button>
					</li>
					<li className={styles.navItem}>
						<Link to="/dashboard" className={styles.navLink}>Войти</Link>
					</li>
				</ul>
			</nav>
		</header>
	)
}
