const steps = [
	{ num: '01', title: 'Создайте пространство', desc: 'Зарегистрируйтесь, создайте проект и пригласите участников. Настройте роли за пару кликов.' },
	{ num: '02', title: 'Организуйте работу', desc: 'Перетаскивайте задачи по канбан-доске, ведите документацию в едином интерфейсе без переключения вкладок.' },
	{ num: '03', title: 'Контролируйте изменения', desc: 'Автоматическое сохранение версий, журнал действий и возможность отката к любому предыдущему состоянию.' },
]

export default function Workflow() {
	return (
		<section className="border-y border-border bg-muted px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-10 text-3xl font-bold text-foreground">Как это работает</h2>
				<div className="grid gap-6 md:grid-cols-3">
					{steps.map(step => (
						<div key={step.num} className="rounded-xl border border-border bg-card p-6">
							<span className="text-sm font-bold tracking-widest text-primary">{step.num}</span>
							<h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
