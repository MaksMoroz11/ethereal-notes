import { CheckCircle2, Clock3, FileText, History, LayoutGrid, ListChecks } from 'lucide-react'

const columns = [
	{
		title: 'Открыта',
		cards: [
			{ title: 'Собрать требования', tag: 'аналитика' },
			{ title: 'Подготовить прототип', tag: 'дизайн' },
		],
	},
	{
		title: 'В работе',
		cards: [{ title: 'Настроить доступы', tag: 'backend' }],
	},
	{
		title: 'Готово',
		cards: [{ title: 'Создать рабочее пространство', tag: 'готово' }],
	},
]

export default function Preview() {
	return (
		<section className="px-6 py-16 md:px-10">
			<div className="mx-auto max-w-6xl">
				<div className="mb-8 max-w-2xl">
					<h2 className="text-2xl font-bold text-foreground md:text-3xl">Все рабочие процессы — в одном месте</h2>
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
						Задачи, документы и история изменений собраны в едином рабочем пространстве.
					</p>
				</div>

				<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<div className="flex items-center gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
							<span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
						</div>
						<div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
							<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
							Версия сохранена
						</div>
					</div>

					<div className="flex min-h-80">
						<aside className="hidden w-44 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3 sm:flex">
							<div className="mb-3 truncate px-2 text-xs font-semibold text-sidebar-foreground">Команда Ethereal</div>
							<div className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-2 text-xs text-foreground">
								<LayoutGrid className="h-3.5 w-3.5 text-primary" />
								Доска задач
						</div>
							<div className="flex items-center gap-2 px-2.5 py-2 text-xs text-sidebar-foreground">
								<FileText className="h-3.5 w-3.5" />
								Документы
							</div>
							<div className="flex items-center gap-2 px-2.5 py-2 text-xs text-sidebar-foreground">
								<History className="h-3.5 w-3.5" />
								История
							</div>
						</aside>

						<div className="min-w-0 flex-1 p-4 md:p-5">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div>
									<div className="text-sm font-semibold text-foreground">Доска команды</div>
									<div className="mt-1 text-[0.65rem] text-muted-foreground">4 задачи · обновлено только что</div>
								</div>
								<div className="hidden items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[0.65rem] text-primary sm:flex">
									<ListChecks className="h-3 w-3" />
									В работе
								</div>
							</div>

							<div className="grid gap-2.5 md:grid-cols-3">
								{columns.map((column, columnIndex) => (
									<div key={column.title} className="min-w-0 rounded-lg bg-muted p-2">
										<div className="mb-2 flex items-center justify-between px-1 text-[0.65rem] font-semibold text-muted-foreground">
											<span>{column.title}</span>
											<span className="rounded-full bg-secondary px-1.5 py-0.5">{column.cards.length}</span>
										</div>
										<div className="space-y-2">
											{column.cards.map((card, cardIndex) => (
												<div
													key={card.title}
													className={`preview-card rounded-md border border-border bg-card p-2.5 ${columnIndex === 1 ? 'preview-card-highlight' : ''}`}
													style={{ animationDelay: `${columnIndex * 450 + cardIndex * 280}ms` }}
												>
													<div className="min-w-0 break-words text-[0.7rem] font-medium leading-snug text-foreground">{card.title}</div>
													<div className="mt-2 flex items-center justify-between gap-2">
														<span className="truncate text-[0.6rem] text-muted-foreground">{card.tag}</span>
														<span className="h-4 w-4 rounded-full bg-primary/30" />
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>

						<aside className="hidden w-52 shrink-0 border-l border-border bg-muted/40 p-4 lg:block">
							<div className="mb-4 flex items-center gap-2 text-xs font-semibold text-foreground">
								<Clock3 className="h-3.5 w-3.5 text-primary" />
								Последние изменения
							</div>
							<div className="preview-event space-y-3 text-[0.65rem] text-muted-foreground">
								<div>
									<span className="font-medium text-foreground">Максим</span> изменил статус задачи
									<div className="mt-1 text-[0.6rem] text-muted-foreground/70">только что</div>
								</div>
								<div className="border-t border-border pt-3">
									<span className="font-medium text-foreground">Анна</span> обновила документ
									<div className="mt-1 text-[0.6rem] text-muted-foreground/70">2 минуты назад</div>
								</div>
							</div>
						</aside>
					</div>
				</div>
			</div>
		</section>
	)
}
