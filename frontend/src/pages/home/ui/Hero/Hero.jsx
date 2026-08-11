import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-background to-muted px-6 py-20 md:px-10 md:py-28">
			<div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
				<div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
					<h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
						Управляйте знаниями команды <br />
						<span className="text-primary">без хаоса</span>
					</h1>
					<p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
						Ethereal Notes — безопасная платформа для заметок с автоматической историей версий и гибкими
						правами доступа. Забудьте о потерянных файлах.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Button asChild size="lg">
							<Link to="/login">Начать бесплатно</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<a href="#features">Узнать больше</a>
						</Button>
					</div>
				</div>
				<div className="rounded-2xl border border-border bg-card/80 p-10 text-center text-muted-foreground shadow-xl animate-in fade-in zoom-in-95 duration-500">
					Интерфейс приложения
				</div>
			</div>
		</section>
	)
}
