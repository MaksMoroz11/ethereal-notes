const features = [
	{ title: 'Канбан-доски', desc: 'Визуализируйте статусы задач. Перетаскивайте карточки, назначайте исполнителей и отслеживайте прогресс.' },
	{ title: 'Документация', desc: 'Создавайте структурированные страницы с вложенностью. Все изменения автоматически сохраняются.' },
	{ title: 'Версионирование', desc: 'История правок для каждой задачи и документа. Откатывайтесь к любой версии в один клик.' },
	{ title: 'Командный доступ', desc: 'Гибкая ролевая модель. Настраивайте права на чтение, редактирование и администрирование.' },
]

export default function Features() {
	return (
		<section id="features" className="px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-10 text-3xl font-bold text-foreground">Возможности платформы</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{features.map(feature => (
						<div
							key={feature.title}
							className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
						>
							<h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
