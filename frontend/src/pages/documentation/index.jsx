import { BookOpen, FileText, History, Kanban, LogIn, ScrollText, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const sections = [
	{
		title: 'Регистрация и вход',
		icon: LogIn,
		text: 'Создайте аккаунт по логину и паролю, затем войдите в систему. После регистрации автоматически создаётся личное рабочее пространство.',
	},
	{
		title: 'Пространства и роли',
		icon: ShieldCheck,
		text: 'Пространство объединяет доски, задачи и документы. Владелец управляет пространством и ролями, администратор управляет содержимым и обычными участниками, участник работает с задачами и документами.',
	},
	{
		title: 'Доски и задачи',
		icon: Kanban,
		text: 'На доске можно создавать задачи, менять их статус, редактировать описание и назначать исполнителя из участников пространства.',
	},
	{
		title: 'Документы и версии',
		icon: FileText,
		text: 'Документы поддерживают форматирование и историю версий. Автосохранение можно отключить в редакторе и сохранять новые версии вручную.',
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
						Краткое руководство по основным возможностям платформы.
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
			</div>
		</section>
	)
}
