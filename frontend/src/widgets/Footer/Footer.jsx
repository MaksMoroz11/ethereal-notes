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
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
							Возможности
						</a>
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
							Тарифы
						</a>
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
							Документация
						</a>
					</div>
					<div className="flex flex-col gap-2">
						<h4 className="text-sm font-semibold text-foreground">Поддержка</h4>
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
							FAQ
						</a>
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
							Контакты
						</a>
						<a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
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
