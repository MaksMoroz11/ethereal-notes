import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/store/authStore'
import styles from './index.module.css'

const LOGIN_PATTERN = /^[A-Za-z0-9_]+$/

export default function Login() {
	const navigate = useNavigate()
	const register = useAuthStore(state => state.register)
	const login = useAuthStore(state => state.login)

	const [mode, setMode] = useState('login')
	const [loginValue, setLoginValue] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	async function submit(e) {
		e.preventDefault()
		setError('')

		if (!LOGIN_PATTERN.test(loginValue)) {
			setError('Логин: только латиница, цифры и _')
			return
		}
		if (password.length < 4) {
			setError('Пароль минимум 4 символа')
			return
		}

		setLoading(true)
		try {
			if (mode === 'register') {
				await register(loginValue, password)
			} else {
				await login(loginValue, password)
			}
			navigate('/dashboard')
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className={styles.page}>
			<div className={styles.card}>
				<h1 className={styles.title}>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>

				<form className={styles.form} onSubmit={submit}>
					<label className={styles.label}>
						Логин
						<input
							className={styles.input}
							value={loginValue}
							autoFocus
							onChange={e => setLoginValue(e.target.value)}
							placeholder="latin_only"
						/>
					</label>

					<label className={styles.label}>
						Пароль
						<input
							className={styles.input}
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="••••••"
						/>
					</label>

					{error && <p className={styles.error}>{error}</p>}

					<button type="submit" className={styles.submit} disabled={loading}>
						{loading ? '…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
					</button>
				</form>

				<button
					className={styles.switch}
					onClick={() => {
						setMode(mode === 'login' ? 'register' : 'login')
						setError('')
					}}
				>
					{mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
				</button>
			</div>
		</section>
	)
}
