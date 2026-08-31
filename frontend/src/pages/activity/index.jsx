import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { api } from '@/shared/api/client'

const LABELS = {
	'workspace.create': 'создал пространство',
	'workspace.rename': 'переименовал пространство',
	'board.create': 'создал доску',
	'board.delete': 'удалил доску',
	'task.create': 'создал задачу',
	'task.update': 'обновил задачу',
	'task.delete': 'удалил задачу',
	'document.create': 'создал документ',
	'document.version': 'сохранил версию',
	'document.restore': 'откатил документ',
	'document.delete': 'удалил документ',
	'member.invite': 'пригласил',
	'member.kick': 'удалил участника',
	'member.role': 'изменил роль участника',
}

function formatDate(iso) {
	return new Date(iso).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function Activity() {
	const activeWorkspaceId = useWorkspaceStore(state => state.activeId)

	if (!activeWorkspaceId) {
		return (
			<div className="px-8 py-12 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
				Выберите пространство слева
			</div>
		)
	}

	return <ActivityFeed key={activeWorkspaceId} workspaceId={activeWorkspaceId} />
}

function ActivityFeed({ workspaceId }) {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let cancelled = false
		api(`/workspaces/${workspaceId}/activity`)
			.then(data => {
				if (!cancelled) setItems(data)
			})
			.catch(err => {
				if (!cancelled) setError(err.message)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [workspaceId])

	if (loading) {
		return (
			<div className="px-8 py-12 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
				Загрузка журнала…
			</div>
		)
	}

	if (error) {
		return <div className="px-8 py-12 text-center text-sm text-destructive">Не удалось загрузить журнал: {error}</div>
	}

	if (items.length === 0) {
		return (
			<div className="px-8 py-12 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
				Пока нет событий
			</div>
		)
	}

	return (
		<section className="flex min-h-[calc(100vh-120px)] flex-col gap-4 bg-background px-8 py-6 animate-in fade-in duration-300">
			<h2 className="text-xl font-bold text-foreground">Журнал действий</h2>
			<ul className="flex max-w-2xl flex-col gap-2">
				{items.map((item, index) => (
					<li
						key={item.id}
						className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 animate-in fade-in fill-mode-both"
						style={{ animationDelay: `${Math.min(index, 12) * 30}ms`, animationDuration: '280ms' }}
					>
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<p className="text-sm text-secondary-foreground">
								<span className="font-semibold text-foreground">{item.user_login}</span>{' '}
								{LABELS[item.action] || item.action}
								{item.title ? (
									<>
										{' '}
										<span className="font-medium text-foreground">«{item.title}»</span>
									</>
								) : null}
							</p>
							<span className="text-[0.7rem] text-muted-foreground/80">{formatDate(item.created_at)}</span>
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}
