import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import UserMenu from './UserMenu'
import { cn } from '@/lib/utils'

export default function Header({ fluid = false }) {
	const user = useAuthStore(state => state.user)
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
		localStorage.setItem('theme', theme)
	}, [theme])

	return (
		<header className="sticky top-0 z-100 border-b border-border bg-card/95 px-6 py-4 shadow-sm backdrop-blur md:px-10">
			<nav className={cn('flex items-center justify-between', fluid ? 'max-w-none' : 'mx-auto max-w-6xl')}>
				<Link to="/" className="text-2xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-85">
					ethereal
				</Link>
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
					{user ? (
						<UserMenu login={user.login} />
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
