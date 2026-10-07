import { useEffect, useRef, useState } from 'react'
import { Clock3, Download } from 'lucide-react'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { useAuthStore } from '@/shared/store/authStore'
import { readDraft, snapshotOf, sameSnapshot } from '@/shared/lib/documentDrafts'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatLocalDate } from '@/shared/lib/date'
import DocumentEditor from './ui/DocumentEditor'
import { api } from '@/shared/api/client'
import { toast } from '@/shared/store/toastStore'
import { documentText } from '@/shared/messages/documents'
import SelectMenu from '@/components/ui/select-menu'

const SAVE_DELAY = 2500
const AUTO_SAVE_STORAGE_KEY = 'ethereal-notes:auto-save'
function formatDate(iso) {
	return formatLocalDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Documents() {
	const documents = useDocumentsStore(state => state.documents)
	const activeId = useDocumentsStore(state => state.activeId)
	const loading = useDocumentsStore(state => state.loading)
	const error = useDocumentsStore(state => state.error)
	const workspace = useWorkspaceStore(state => state.workspaces.find(item => item.id === state.activeId))
	const doc = documents.find(item => item.id === activeId)
	if (loading && !doc) return <div className="px-8 py-12 text-center text-sm text-muted-foreground">{documentText.loading}</div>
	if (error) return <div className="px-8 py-12 text-center text-sm text-destructive">{documentText.loadError} {error}</div>
	if (!doc) return <div className="px-8 py-12 text-center text-sm text-muted-foreground">{documentText.select}</div>
	return <DocumentWorkspace key={doc.id} doc={doc} isManager={workspace?.role === 'owner' || workspace?.role === 'admin'} />
}

function DocumentWorkspace({ doc, isManager }) {
	const userId = useAuthStore(state => state.user?.id)
	const storedDraft = useDocumentsStore(state => state.drafts[doc.id])
	const draft = storedDraft || readDraft(userId, doc.id) || doc
	const { title, content } = draft
	const saveStatus = useDocumentsStore(state => state.statuses[doc.id] || 'saved')
	const saveError = useDocumentsStore(state => state.saveErrors[doc.id] || '')
	const conflict = useDocumentsStore(state => state.conflicts[doc.id])
	const resolveConflict = useDocumentsStore(state => state.resolveConflict)
	const [exporting, setExporting] = useState(false)
	const restoring = useDocumentsStore(state => state.restoring[doc.id] || false)
	const editDraft = useDocumentsStore(state => state.editDraft)
	const saveDraft = useDocumentsStore(state => state.saveDraft)
	const restoreVersion = useDocumentsStore(state => state.restoreVersion)
	const [previewId, setPreviewId] = useState(null)
	const [confirmId, setConfirmId] = useState(null)
	const [autoSave, setAutoSave] = useState(() => localStorage.getItem(AUTO_SAVE_STORAGE_KEY) !== 'false')
	const autoSaveRef = useRef(autoSave)
	const hasUnsavedChanges = !sameSnapshot(snapshotOf(draft), doc)
	useEffect(() => { autoSaveRef.current = autoSave }, [autoSave])
	useEffect(() => {
		if (!autoSave || !isManager || previewId || restoring || conflict || !hasUnsavedChanges) return
		const timer = setTimeout(() => saveDraft(doc.id, { drain: () => autoSaveRef.current, enabled: () => autoSaveRef.current }).catch(() => {}), SAVE_DELAY)
		return () => clearTimeout(timer)
	}, [autoSave, isManager, previewId, restoring, conflict, hasUnsavedChanges, title, content, doc.id, saveDraft])
	useEffect(() => {
		const id = doc.id
		return () => { if (autoSaveRef.current && isManager) saveDraft(id, { drain: () => autoSaveRef.current, enabled: () => autoSaveRef.current }).catch(() => {}) }
	}, [doc.id, isManager, saveDraft])

    async function exportDocument(format) {
        if (!format || exporting) return
        setExporting(true)
        try {
            if (conflict) throw new Error(documentText.conflict)
            if (isManager) await saveDraft(doc.id)
            const state = useDocumentsStore.getState()
            const saved = state.documents.find(item => item.id === doc.id)
            if (state.conflicts[doc.id] || (state.drafts[doc.id] && !sameSnapshot(state.drafts[doc.id], saved))) throw new Error(documentText.conflict)
            const blob = await api(`/documents/${doc.id}/export?format=${format}`, { blob: true })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${doc.title.replace(/[/\\:*?"<>|]/g, '_')}.${format}`
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
            toast(documentText.exported)
        } catch (error) { toast(error.message, 'error') }
        finally { setExporting(false) }
    }
	function toggleAutoSave(event) {
		const enabled = event.target.checked
		autoSaveRef.current = enabled
		setAutoSave(enabled)
		localStorage.setItem(AUTO_SAVE_STORAGE_KEY, String(enabled))
	}
	function commitTitle() {
		const next = title.trim() || documentText.untitled
		if (isManager && !previewId && !restoring && next !== title) editDraft(doc.id, { title: next })
	}
	function saveManualVersion() { saveDraft(doc.id, { drain: () => autoSaveRef.current }).catch(() => {}) }
	async function confirmRestore() {
		if (!confirmVersion || restoring) return
		try {
			await restoreVersion(doc.id, confirmVersion.id)
			setPreviewId(null)
			setConfirmId(null)
		} catch { /* The store keeps the draft and exposes the error. */ }
	}
	const preview = previewId ? doc.versions.find(version => version.id === previewId) : null
	const confirmIndex = confirmId ? doc.versions.findIndex(version => version.id === confirmId) : -1
	const confirmVersion = confirmIndex >= 0 ? doc.versions[confirmIndex] : null
	const shownUpdatedAt = preview ? preview.created_at : doc.updated_at
	const shownUpdatedBy = preview ? preview.author_login || documentText.unknownAuthor : doc.updated_by || doc.author_login || documentText.unknownAuthor
	const statusLabel = saveStatus === 'saving' ? documentText.saving : hasUnsavedChanges ? documentText.unsaved : documentText.saved

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
							создал <span className="font-medium text-foreground">{doc.author_login || documentText.unknownAuthor}</span>
						</span>
					</div>
                    <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <SelectMenu ariaLabel="Экспорт документа" value="" disabled={exporting || Boolean(preview) || Boolean(conflict)}
                            onValueChange={exportDocument} options={[{ value: '', label: exporting ? documentText.exporting : documentText.export }, { value: 'pdf', label: 'PDF' }, { value: 'docx', label: 'DOCX (Word)' }]} />
                    </div>
					{preview || !isManager ? null : (
						<div className="flex flex-wrap items-center justify-end gap-3">
							<label className="flex items-center gap-2 text-[0.7rem] text-muted-foreground/80">
								<Checkbox checked={autoSave} onChange={toggleAutoSave} />
								{documentText.autoSave}
							</label>
							<span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground/80">{statusLabel}</span>
							{!autoSave ? (
								<Button type="button" size="sm" disabled={!hasUnsavedChanges || saveStatus === 'saving'} onClick={saveManualVersion}>
									Сохранить версию
								</Button>
							) : null}
						</div>
					)}
				</div>
                {conflict ? <div role="alert" className="space-y-3 rounded-xl border border-primary/40 bg-card p-4 text-sm">
                    <p>{documentText.conflict}</p>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => resolveConflict(doc.id, false).catch(() => {})}>{documentText.loadServer}</Button>
                        <Button size="sm" onClick={() => resolveConflict(doc.id, true).catch(() => {})}>{documentText.keepMine}</Button>
                    </div>
                </div> : null}
				{saveError ? <div className="text-right text-sm text-destructive">
					<p role="alert">{saveError}</p>
					{autoSave && !preview && !restoring ? <Button type="button" variant="outline" size="sm" onClick={saveManualVersion}>{documentText.retrySave}</Button> : null}
				</div> : null}

				{preview ? (
					<div className="flex items-center justify-between gap-4 rounded-lg border border-primary/25 bg-accent px-3.5 py-2.5 text-sm text-primary animate-in fade-in duration-200">
						<span>Просмотр версии от {formatDate(preview.created_at)}</span>
						<Button type="button" variant="ghost" size="sm" onClick={() => setPreviewId(null)}>
							{documentText.current}
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
						onChange={e => editDraft(doc.id, { title: e.target.value })}
						onBlur={commitTitle}
						onKeyDown={e => e.key === 'Enter' && e.target.blur()}
						placeholder={documentText.titlePlaceholder}
						readOnly={Boolean(preview) || !isManager || restoring}
					/>

					<DocumentEditor
						key={`${doc.id}-${previewId ?? 'current'}`}
						content={preview ? preview.content : content}
						editable={!preview && isManager && !restoring}
						onChange={value => editDraft(doc.id, { content: value })}
					/>
				</div>
			</div>

			<aside className="relative z-0 flex max-h-[calc(100vh-180px)] min-h-0 w-full flex-col gap-3 self-start overflow-hidden rounded-xl border border-border bg-muted p-3.5 animate-in fade-in duration-300">
				<div className="relative z-10 flex shrink-0 items-center gap-2 bg-muted text-sm font-semibold text-secondary-foreground">
					<Clock3 className="h-3.5 w-3.5" />
					<span>{documentText.versions}</span>
					<span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] text-muted-foreground">
						{doc.versions.length}
					</span>
				</div>

				{doc.versions.length === 0 ? (
					<p className="px-1 py-2 text-sm text-muted-foreground/80">{documentText.emptyVersions}</p>
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
												{version.author_login || documentText.unknownAuthor}
											</span>
										</span>
										<span className="truncate text-sm text-secondary-foreground">{version.title}</span>
									</button>
									{version.restored_from_id ? <button type="button" className="self-start text-left text-[0.7rem] text-primary hover:underline" onClick={() => setPreviewId(version.restored_from_id)}>
										{documentText.restoredFrom(doc.versions.length - doc.versions.findIndex(item => item.id === version.restored_from_id))}
									</button> : null}
									{isManager ? <Button
										type="button"
										variant="outline"
										size="sm"
										className="self-start"
										disabled={restoring}
										onClick={() => setConfirmId(version.id)}
									>
										{documentText.restore}
									</Button> : null}
								</li>
							))}
						</ul>
					</div>
				)}
			</aside>

			<ConfirmDialog
				open={Boolean(confirmVersion)}
				title={documentText.restoreTitle}
				text={
					confirmVersion
						? documentText.restoreConfirmation(doc.versions.length - confirmIndex, formatDate(confirmVersion.created_at))
						: ''
				}
				confirmLabel={documentText.restore}
				onConfirm={confirmRestore}
				busy={restoring}
				error={saveError}
				onCancel={() => { if (!restoring) setConfirmId(null) }}
			/>
		</section>
	)
}
