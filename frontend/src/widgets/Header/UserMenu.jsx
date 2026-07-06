import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faRightFromBracket, faTableColumns } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../../shared/store/authStore'
import styles from './UserMenu.module.css'

export default function UserMenu({ login }) {
	const navigate = useNavigate()
	const logout = useAuthStore(state => state.logout)
	const [open, setOpen] = useState(false)
	const ref = useRef(null)

	useEffect(() => {
		function onClickOutside(e) {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false)
		}
		document.addEventListener('mousedown', onClickOutside)
		return () => document.removeEventListener('mousedown', onClickOutside)
	}, [])

	function goDashboard() {
		setOpen(false)
		navigate('/dashboard')
	}

	function handleLogout() {
		setOpen(false)
		logout()
		navigate('/login')
	}

	return (
		<div className={styles.wrap} ref={ref}>
			<button
				className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
				onClick={() => setOpen(prev => !prev)}
			>
				<span className={styles.avatar}>
					<FontAwesomeIcon icon={faUser} />
				</span>
				<span className={styles.name}>{login}</span>
			</button>

			{open && (
				<div className={styles.menu}>
					<span className={styles.menuName}>{login}</span>
					<button className={styles.item} onClick={goDashboard}>
						<FontAwesomeIcon icon={faTableColumns} />
						Мои доски
					</button>
					<button className={styles.logout} onClick={handleLogout}>
						<FontAwesomeIcon icon={faRightFromBracket} />
						Выйти
					</button>
				</div>
			)}
		</div>
	)
}
