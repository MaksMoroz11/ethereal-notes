import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun, faUser } from '@fortawesome/free-solid-svg-icons'
import styles from './Header.module.css'

export default function Header({ fluid = false }) {
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
			<nav className={`${styles.navbar} ${fluid ? styles.navbarFluid : ''}`}>
				<Link to="/" className={styles.title}>ethereal</Link>
				<ul className={styles.navbarNav}>
					<li className={styles.navItem}>
						<button className={styles.themeButton} onClick={toggleTheme} aria-label="Сменить тему">
							<FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
						</button>
					</li>
					<li className={styles.navItem}>
						{fluid ? (
							<div className={styles.user}>
								<span className={styles.avatar}>
									<FontAwesomeIcon icon={faUser} />
								</span>
								<span className={styles.userName}>Гость</span>
							</div>
						) : (
							<Link to="/dashboard" className={styles.navLink}>Войти</Link>
						)}
					</li>
				</ul>
			</nav>
		</header>
	)
}
