import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, History, LayoutGrid, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

function scrollToFeatures(event) {
	event.preventDefault()
	document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	window.history.replaceState(null, '', '/#features')
}

export default function Hero() {
	return (
		<section className="hero-section relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-background to-muted px-6 py-20 md:px-10 md:py-28">
			<div className="hero-grid mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
				<div className="hero-copy animate-in fade-in slide-in-from-bottom-3 duration-500">
					<h1 className="hero-title text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
						Управляйте знаниями команды <br />
						<span className="text-primary">без хаоса</span>
					</h1>
					<p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
						Ethereal Notes — безопасная платформа для заметок с автоматической историей версий и гибкими
						правами доступа. Забудьте о потерянных файлах.
					</p>
					<div className="hero-actions mt-8 flex flex-wrap gap-3">
						<Button asChild size="lg">
							<Link to="/login?mode=register">Начать бесплатно</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<a href="#features" onClick={scrollToFeatures}>Узнать больше</a>
						</Button>
					</div>
				</div>
				<div className="hero-demo overflow-hidden rounded-2xl border border-border bg-card/80 shadow-xl animate-in fade-in zoom-in-95 duration-500">
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
							<LayoutGrid className="h-4 w-4 text-primary" />
							<span className="truncate">Команда Ethereal</span>
						</div>
						<div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
							<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
							<span className="hidden sm:inline">Версия сохранена</span>
						</div>
					</div>
					<div className="grid grid-cols-[116px_1fr]">
						<div className="flex flex-col gap-2 border-r border-border bg-sidebar p-3 text-[0.65rem] text-sidebar-foreground">
							<div className="flex items-center gap-2 rounded-md bg-accent px-2 py-2 text-foreground">
								<LayoutGrid className="h-3.5 w-3.5 text-primary" />
								Доска
							</div>
							<div className="flex items-center gap-2 px-2 py-2">
								<FileText className="h-3.5 w-3.5 text-primary" />
								Документы
							</div>
							<div className="flex items-center gap-2 px-2 py-2">
								<History className="h-3.5 w-3.5" />
								История
							</div>
						</div>
						<div className="min-w-0 p-4">
							<div className="mb-3 flex items-center justify-between">
								<span className="text-xs font-semibold text-foreground">Доска проекта</span>
								<div className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
									<UsersRound className="h-3 w-3" /> 3 участника
								</div>
							</div>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
								{[
									['Открыта', 'Собрать требования'],
									['В работе', 'Настроить доступы'],
									['Готово', 'Создать проект'],
								].map(([status, title], index) => (
									<div key={status} className="min-w-0 rounded-md bg-muted p-1.5">
										<div className="mb-1.5 truncate text-[0.55rem] font-semibold text-muted-foreground">{status}</div>
										<div
											className="min-w-0 break-words rounded border border-border bg-card p-2 text-[clamp(0.52rem,1.8vw,0.6rem)] leading-snug text-foreground animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
											style={{ animationDelay: `${index * 160 + 250}ms` }}
										>
											{title}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
