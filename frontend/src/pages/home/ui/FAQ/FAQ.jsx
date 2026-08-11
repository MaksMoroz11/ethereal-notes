const faqs = [
	{ q: 'Чем Ethereal отличается от Trello или Notion?', a: 'Мы объединяем канбан-доски и документацию в одном месте с обязательным версионированием. Вы не теряете контекст при переключении между задачами и текстами.' },
	{ q: 'Как работает сохранение версий?', a: 'Система автоматически фиксирует изменения при каждом редактировании. Вы можете просмотреть историю и откатиться к любой точке без потери новых данных.' },
	{ q: 'Можно ли развернуть систему на своём сервере?', a: 'Да. Архитектура предусматривает самостоятельный деплой. В рамках дипломного проекта реализована базовая версия, готовая к адаптации под внутренние сети.' },
	{ q: 'Есть ли ограничения по количеству участников?', a: 'В базовой версии поддерживаются команды до 5 человек. Для учебных и демонстрационных целей ограничений нет.' },
]

export default function FAQ() {
	return (
		<section className="px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<h2 className="mb-10 text-3xl font-bold text-foreground">Частые вопросы</h2>
				<div className="space-y-4">
					{faqs.map(item => (
						<div key={item.q} className="rounded-xl border border-border bg-card p-5">
							<h3 className="text-base font-semibold text-foreground">{item.q}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
