import { Bell, BookOpen, Download, FileText, History, Kanban, LogIn, ScrollText, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const sections = [
	{ title: 'Совместная работа', icon: History, text: 'Изменения команды появляются автоматически при проверке раз в 10 секунд. Окно задачи, фильтр и ввод сохраняются. В скрытой вкладке обновление приостанавливается.' },
	{ title: 'Уведомления', icon: Bell, text: 'Колокольчик показывает личные приглашения, изменения роли, назначения и перемещения задач. История и отметка прочтения сохраняются после выхода. Уведомление ведёт к доступному объекту.' },
	{ title: 'Экспорт документов', icon: Download, text: 'В текущем документе выберите «Экспорт → PDF / DOCX». Перед выгрузкой черновик сохраняется; ошибка или конфликт останавливают экспорт. Читать и экспортировать могут все участники пространства.' },
	{
		title: 'Регистрация и вход',
		icon: LogIn,
		text: 'Создайте аккаунт по логину и паролю, отдельно подтвердив согласие на обработку данных. Личное пространство создаётся автоматически. «Запомнить меня» сохраняет вход до 30 дней, обычный вход — до 24 часов. Политика и согласие доступны по ссылкам в форме.',
	},
	{
		title: 'Пространства и роли',
		icon: ShieldCheck,
		text: 'Владелец и администратор управляют досками, папками, задачами и документами. Участник читает документы, экспортирует их и видит только назначенные ему задачи. Он может менять колонку своей задачи; содержание и исполнителя меняют руководители.',
	},
	{
		title: 'Доски и задачи',
		icon: Kanban,
		text: 'Новая доска начинается без колонок. Создавайте, переименовывайте и переставляйте колонки, затем добавляйте и назначайте задачи. Администратор и владелец могут смотреть задачи любого участника или все сразу.',
	},
	{
		title: 'Документы и версии',
		icon: FileText,
		text: 'Доски и документы можно раскладывать по вложенным папкам и находить через поиск. Документы поддерживают форматирование, черновики, автосохранение и историю версий. При одновременной правке черновик сохраняется: можно загрузить серверную редакцию или явно сохранить свой текст.',
	},
	{
		title: 'Журнал действий',
		icon: ScrollText,
		text: 'В журнале отображаются основные изменения пространства: работа с участниками, досками, задачами и версиями документов.',
	},
]

export default function Documentation() {
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
	}, [])

	return (
		<section className="min-h-[calc(100vh-160px)] bg-background px-6 py-16 md:px-10">
			<div className="mx-auto max-w-4xl">
				<div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
					<Link to="/" className="text-sm text-primary hover:underline">← На главную</Link>
					<h1 className="mt-4 flex items-center gap-3 text-3xl font-bold text-foreground">
						<BookOpen className="h-7 w-7 text-primary" />
						Документация Ethereal
					</h1>
					<p className="mt-3 max-w-2xl text-muted-foreground">
						Краткое руководство по реализованным возможностям платформы.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					{sections.map((section, index) => (
						<article
							key={section.title}
							className="rounded-xl border border-border bg-card p-5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
							style={{ animationDelay: `${index * 80 + 120}ms` }}
						>
							<div className="mb-3 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<section.icon className="h-4 w-4" />
								</div>
								<h2 className="text-base font-semibold text-foreground">{section.title}</h2>
							</div>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.text}</p>
						</article>
					))}
				</div>
				<div className="mt-10 space-y-8">
                    <h2 className="text-xl font-semibold">Примеры интерфейса</h2>
                    {[
                        ['registration', 'Регистрация с отдельным согласием'],
                        ['member-kanban', 'Канбан участника и выбор колонки'],
                        ['editor-versions', 'Редактор и история версий'],
                        ['notifications', 'Личные уведомления'],
                        ['export', 'Экспорт текущего документа'],
                    ].map(([name, caption]) => <figure key={name}>
                        <img src={`/screenshots/${name}.jpg`} alt={caption} loading="lazy" className="w-full rounded-xl border border-border" />
                        <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>
                    </figure>)}
                    <p className="text-sm text-muted-foreground">Снимки получены на демонстрационных данных. Согласие и политика являются учебными текстами; ссылки доступны в форме регистрации и подвале сайта.</p>
                    <h2 className="text-xl font-semibold">Планы развития</h2>
                    <p className="text-sm text-muted-foreground">Импорт документов, сравнение редакций, уведомления по email и расширенный поиск пока не реализованы.</p>
                </div>
			</div>
		</section>
	)
}
