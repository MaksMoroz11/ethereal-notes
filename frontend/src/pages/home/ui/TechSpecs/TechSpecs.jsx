import { History, ListChecks, Server, ShieldCheck } from 'lucide-react'

const specs = [
	{ title: 'Версионирование', icon: History, desc: 'Каждое изменение сохраняется автоматически. Сравнивайте версии и возвращайтесь к предыдущим состояниям без потери данных.' },
	{ title: 'Ролевая модель', icon: ShieldCheck, desc: 'Точный контроль доступа. Назначайте права на уровне проекта, доски или отдельного документа.' },
	{ title: 'Журнал действий', icon: ListChecks, desc: 'Прозрачная история: кто, когда и что изменил. Аудит активности встроен в систему по умолчанию.' },
	{ title: 'Локальное развёртывание', icon: Server, desc: 'Архитектура готова к деплою внутри корпоративной сети. Данные остаются под полным контролем команды.' },
]

export default function TechSpecs() {
	return (
		<section className="border-y border-border bg-muted px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-10 text-3xl font-bold text-foreground">Технические возможности</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					{specs.map(spec => (
						<div key={spec.title} className="rounded-xl border border-border bg-card p-5">
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<spec.icon className="h-4 w-4" />
								</div>
								<h3 className="text-lg font-semibold text-foreground">{spec.title}</h3>
							</div>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{spec.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
