import { History, ListChecks, PlusCircle } from 'lucide-react'

const steps = [
	{ num: '01', icon: PlusCircle, title: 'Создайте пространство', desc: 'Зарегистрируйтесь, создайте проект и пригласите участников. Настройте роли за пару кликов.' },
	{ num: '02', icon: ListChecks, title: 'Организуйте работу', desc: 'Перетаскивайте задачи по канбан-доске, ведите документацию в едином интерфейсе без переключения вкладок.' },
	{ num: '03', icon: History, title: 'Контролируйте изменения', desc: 'Автоматическое сохранение версий, журнал действий и возможность отката к любому предыдущему состоянию.' },
]

export default function Workflow() {
	return (
		<section className="border-y border-border bg-muted px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-10 text-3xl font-bold text-foreground">Как это работает</h2>
				<div className="grid gap-6 md:grid-cols-3">
					{steps.map(step => (
						<div key={step.num} className="rounded-xl border border-border bg-card p-6">
							<div className="flex items-center justify-between">
								<span className="text-sm font-bold tracking-widest text-primary">{step.num}</span>
								<step.icon className="h-5 w-5 text-primary" />
							</div>
							<h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
