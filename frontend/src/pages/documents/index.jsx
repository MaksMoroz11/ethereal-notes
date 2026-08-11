import { useEffect, useState } from 'react'
import { Clock3, Save } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function formatDate(iso) {
	return new Date(iso).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function Documents() {
	const userLogin = useAuthStore(state => state.user?.login ?? '')
	const documents = useDocumentsStore(state => state.documents)
	const activeId = useDocumentsStore(state => state.activeId)
	const updateDocument = useDocumentsStore(state => state.updateDocument)
	const saveVersion = useDocumentsStore(state => state.saveVersion)
	const restoreVersion = useDocumentsStore(state => state.restoreVersion)

	const doc = documents.find(d => d.id === activeId) || null
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('')
	const [previewId, setPreviewId] = useState(null)
	const [confirmId, setConfirmId] = useState(null)

	useEffect(() => {
		if (!doc) {
			setTitle('')
			setContent('')
			setPreviewId(null)
			setConfirmId(null)
			return
		}
		setTitle(doc.title)
		setContent(doc.content)
		setPreviewId(null)
		setConfirmId(null)
	}, [activeId])

	if (!doc) {
		return (
			<div className="px-8 py-12 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
				Создайте или выберите документ слева
			</div>
		)
	}

	const preview = previewId ? doc.versions.find(v => v.id === previewId) : null
	const confirmIndex = confirmId ? doc.versions.findIndex(v => v.id === confirmId) : -1
	const confirmVersion = confirmIndex >= 0 ? doc.versions[confirmIndex] : null
	const dropCount = confirmIndex > 0 ? confirmIndex : 0

	const shownUpdatedAt = preview ? preview.created_at : doc.updated_at
	const shownUpdatedBy = preview
		? preview.author_login || 'неизвестно'
		: doc.updated_by || doc.versions[0]?.author_login || doc.author_login || 'неизвестно'

	function commitTitle() {
		const value = title.trim() || 'Без названия'
		setTitle(value)
		if (value !== doc.title) updateDocument(doc.id, { title: value }, userLogin)
	}

	function handleContentBlur() {
		if (previewId) return
		const nextTitle = title.trim() || 'Без названия'
		setTitle(nextTitle)
		const latest = doc.versions[0]
		if (latest && latest.title === nextTitle && latest.content === content) {
			if (nextTitle !== doc.title || content !== doc.content) {
				updateDocument(doc.id, { title: nextTitle, content }, userLogin)
			}
			return
		}
		if (nextTitle === doc.title && content === doc.content) return
		saveVersion(doc.id, { title: nextTitle, content, author_login: userLogin })
	}

	function handleSaveVersion() {
		const nextTitle = title.trim() || 'Без названия'
		setTitle(nextTitle)
		const latest = doc.versions[0]
		if (latest && latest.title === nextTitle && latest.content === content) return
		saveVersion(doc.id, { title: nextTitle, content, author_login: userLogin })
	}

	function confirmRestore() {
		if (!confirmVersion) return
		restoreVersion(doc.id, confirmVersion.id, userLogin)
		setTitle(confirmVersion.title)
		setContent(confirmVersion.content)
		setPreviewId(null)
		setConfirmId(null)
	}

	return (
		<section className="relative z-0 grid min-h-[calc(100vh-120px)] gap-5 overflow-x-hidden bg-background px-8 py-6 animate-in fade-in duration-300 lg:grid-cols-[minmax(0,1fr)_260px]">
			<div className="relative z-0 flex min-w-0 flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div
						key={`meta-${doc.id}-${previewId ?? 'current'}`}
						className="morph-in flex flex-col gap-1"
					>
						<span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground/80">
							обновлено {formatDate(shownUpdatedAt)}
						</span>
						<span className="text-sm text-muted-foreground">
							обновил <span className="font-medium text-foreground">{shownUpdatedBy}</span>
						</span>
						<span className="text-sm text-muted-foreground">
							создал <span className="font-medium text-foreground">{doc.author_login || 'неизвестно'}</span>
						</span>
					</div>
					<Button type="button" onClick={handleSaveVersion}>
						<Save />
						Сохранить версию
					</Button>
				</div>

				{preview ? (
					<div className="flex items-center justify-between gap-4 rounded-lg border border-primary/25 bg-accent px-3.5 py-2.5 text-sm text-primary animate-in fade-in duration-200">
						<span>Просмотр версии от {formatDate(preview.created_at)}</span>
						<Button type="button" variant="ghost" size="sm" onClick={() => setPreviewId(null)}>
							К текущей
						</Button>
					</div>
				) : null}

				<div
					key={`body-${doc.id}-${previewId ?? 'current'}`}
					className="morph-in flex flex-col gap-4"
				>
					<Input
						className="h-auto border-0 border-b border-border bg-transparent px-0 text-xl font-bold shadow-none focus-visible:border-primary focus-visible:ring-0"
						value={preview ? preview.title : title}
						onChange={e => setTitle(e.target.value)}
						onBlur={commitTitle}
						onKeyDown={e => e.key === 'Enter' && e.target.blur()}
						placeholder="Название документа"
						readOnly={Boolean(preview)}
					/>

					<Textarea
						className="min-h-105 flex-1 resize-y rounded-xl p-5 text-sm leading-relaxed"
						value={preview ? preview.content : content}
						onChange={e => setContent(e.target.value)}
						onBlur={handleContentBlur}
						placeholder="Текст документа…"
						readOnly={Boolean(preview)}
					/>
				</div>
			</div>

			<aside className="relative z-0 flex max-h-[calc(100vh-180px)] min-h-0 w-full flex-col gap-3 self-start overflow-hidden rounded-xl border border-border bg-muted p-3.5 animate-in fade-in duration-300">
				<div className="relative z-10 flex shrink-0 items-center gap-2 bg-muted text-sm font-semibold text-secondary-foreground">
					<Clock3 className="h-3.5 w-3.5" />
					<span>Версии</span>
					<span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] text-muted-foreground">
						{doc.versions.length}
					</span>
				</div>

				{doc.versions.length === 0 ? (
					<p className="px-1 py-2 text-sm text-muted-foreground/80">Пока нет сохранённых версий</p>
				) : (
					<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
						<ul className="space-y-2 pb-2">
							{doc.versions.map((version, index) => (
								<li
									key={version.id}
									className={cn(
										'flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 transition duration-200 hover:border-primary/35 hover:bg-accent/50 animate-in fade-in fill-mode-both',
										previewId === version.id && 'border-primary bg-accent'
									)}
									style={{ animationDelay: `${index * 40 + 30}ms`, animationDuration: '280ms' }}
								>
									<button
										type="button"
										className="flex w-full flex-col gap-0.5 text-left"
										onClick={() => setPreviewId(version.id === previewId ? null : version.id)}
									>
										<span className="text-[0.7rem] font-semibold uppercase tracking-wide text-primary">
											v{doc.versions.length - index}
										</span>
										<span className="text-[0.7rem] text-muted-foreground/80">
											{formatDate(version.created_at)}
										</span>
										<span className="text-[0.7rem] text-muted-foreground">
											обновил{' '}
											<span className="font-medium text-secondary-foreground">
												{version.author_login || 'неизвестно'}
											</span>
										</span>
										<span className="truncate text-sm text-secondary-foreground">{version.title}</span>
									</button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="self-start"
										onClick={() => setConfirmId(version.id)}
									>
										Откатить
									</Button>
								</li>
							))}
						</ul>
					</div>
				)}
			</aside>

			<ConfirmDialog
				open={Boolean(confirmVersion)}
				title="Откатить документ?"
				text={
					confirmVersion
						? `Вернёмся к версии от ${formatDate(confirmVersion.created_at)}.` +
							(dropCount > 0
								? ` Будет удалено более новых версий: ${dropCount}.`
								: ' Более новых версий нет.')
						: ''
				}
				confirmLabel="Откатить"
				onConfirm={confirmRestore}
				onCancel={() => setConfirmId(null)}
			/>
		</section>
	)
}
