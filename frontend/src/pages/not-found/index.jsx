import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 animate-in fade-in duration-300">
			<div className="text-center">
				<span className="text-6xl font-bold text-primary">404</span>
				<h1 className="mt-4 text-2xl font-bold text-foreground">Страница не найдена</h1>
				<p className="mt-2 text-muted-foreground">
					Такой страницы не существует или она была перемещена.
				</p>
				<Button asChild className="mt-6">
					<Link to="/">На главную</Link>
				</Button>
			</div>
		</div>
	)
}
