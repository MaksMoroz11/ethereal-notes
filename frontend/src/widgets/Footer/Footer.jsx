import { CircleHelp, FileText, GitBranch, Mail, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

function SectionLink({ id, icon: Icon, children }) {
	const location = useLocation()

	function handleClick(event) {
		if (location.pathname !== '/') return
		event.preventDefault()
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		window.history.replaceState(null, '', `/#${id}`)
	}

	return (
		<a href={`/#${id}`} onClick={handleClick} className="text-sm text-muted-foreground transition hover:text-foreground">
			<Icon className="mr-1.5 inline h-3.5 w-3.5" />
			{children}
		</a>
	)
}

export default function Footer() {
	return (
		<footer className="border-t border-border bg-card px-6 py-10 md:px-10">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
				<div className="max-w-sm">
					<h3 className="text-lg font-bold text-foreground">ethereal</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						Безопасная платформа для заметок с историей версий и контролем доступа.
					</p>
				</div>
				<div className="flex gap-12">
					<div className="flex flex-col gap-2">
						<h4 className="text-sm font-semibold text-foreground">Проект</h4>
						<SectionLink id="features" icon={Sparkles}>Возможности</SectionLink>
						<Link to="/documentation" className="text-sm text-muted-foreground transition hover:text-foreground">
							<FileText className="mr-1.5 inline h-3.5 w-3.5" />
							Документация
						</Link>
					</div>
					<div className="flex flex-col gap-2">
						<h4 className="text-sm font-semibold text-foreground">Поддержка</h4>
						<SectionLink id="faq" icon={CircleHelp}>FAQ</SectionLink>
						<a href="mailto:maksim.morozov2706@gmail.com" className="text-sm text-muted-foreground transition hover:text-foreground">
							<Mail className="mr-1.5 inline h-3.5 w-3.5" />
							Контакты
						</a>
						<a href="https://github.com/MaksMoroz11/ethereal-notes" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground transition hover:text-foreground">
							<GitBranch className="mr-1.5 inline h-3.5 w-3.5" />
							GitHub
						</a>
					</div>
				</div>
			</div>
			<div className="mx-auto mt-8 max-w-6xl border-t border-border pt-4 text-sm text-muted-foreground">
				© {new Date().getFullYear()} Ethereal Notes. Дипломный проект.
			</div>
		</footer>
	)
}
