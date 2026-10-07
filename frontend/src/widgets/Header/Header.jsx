import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import UserMenu from './UserMenu'
import NotificationBell from './NotificationBell'
import { cn } from '@/lib/utils'
import { authText } from '@/shared/messages/auth'

export default function Header({ fluid = false, onMenuClick }) {
	const user = useAuthStore(state => state.user)
	const validated = useAuthStore(state => state.validated)
	const validating = useAuthStore(state => state.validating)
	const sessionError = useAuthStore(state => state.error)
	const validateSession = useAuthStore(state => state.validateSession)
	useEffect(() => { if (!validated) validateSession() }, [validated, validateSession])
	useEffect(() => {
		const refresh = () => { if (!document.hidden) validateSession({ force: true }) }
		window.addEventListener('focus', refresh)
		window.addEventListener('online', refresh)
		window.addEventListener('pageshow', refresh)
		document.addEventListener('visibilitychange', refresh)
		return () => {
			window.removeEventListener('focus', refresh)
			window.removeEventListener('online', refresh)
			window.removeEventListener('pageshow', refresh)
			document.removeEventListener('visibilitychange', refresh)
		}
	}, [validateSession])
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
		localStorage.setItem('theme', theme)
	}, [theme])

	return (
		<header className="sticky top-0 z-100 border-b border-border bg-card/95 px-6 py-4 shadow-sm backdrop-blur md:px-10">
			<nav className={cn('flex items-center justify-between', fluid ? 'max-w-none' : 'mx-auto max-w-6xl')}>
				<div className="flex items-center gap-2">
					{onMenuClick ? (
						<Button
							variant="ghost"
							size="icon"
							aria-label="Открыть меню"
							onClick={onMenuClick}
							className="md:hidden"
						>
							<Menu />
						</Button>
					) : null}
					<Link to="/" className="text-2xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-85">
						ethereal
					</Link>
				</div>
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Сменить тему"
						onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
						className="text-muted-foreground hover:rotate-[-8deg]"
					>
						{theme === 'dark' ? <Sun /> : <Moon />}
					</Button>
					{!user && (!validated || validating) ? (
						sessionError ? <Button variant="ghost" onClick={() => validateSession({ force: true })}>{authText.retry}</Button>
							: <span role="status" className="text-xs text-muted-foreground">{authText.checkingSession}</span>
					) : user ? (
						<><NotificationBell /><UserMenu login={user.login} /></>
					) : (
						<Button asChild variant="ghost">
							<Link to="/login">Войти</Link>
						</Button>
					)}
				</div>
			</nav>
		</header>
	)
}
