import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
			if (mode === 'register') await register(loginValue, password)
			else await login(loginValue, password)
			navigate('/dashboard')
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-12 animate-in fade-in duration-300">
			<div className="w-full max-w-md rounded-xl border border-border border-l-[3px] border-l-primary bg-card p-8 shadow-lg">
				<h1 className="mb-6 text-2xl font-bold text-foreground">
					{mode === 'login' ? 'Вход' : 'Регистрация'}
				</h1>

				<form className="flex flex-col gap-4" onSubmit={submit}>
					<div className="space-y-2">
						<Label htmlFor="login">Логин</Label>
						<Input
							id="login"
							value={loginValue}
							autoFocus
							onChange={e => setLoginValue(e.target.value)}
							placeholder="latin_only"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Пароль</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="••••••"
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<Button type="submit" disabled={loading} className="mt-2">
						{loading ? '…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
					</Button>
				</form>

				<Button
					type="button"
					variant="link"
					className="mt-4 px-0"
					onClick={() => {
						setMode(mode === 'login' ? 'register' : 'login')
						setError('')
					}}
				>
					{mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
				</Button>
			</div>
		</section>
	)
}
