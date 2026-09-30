import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SelectMenu from '@/components/ui/select-menu'
import { api } from '@/shared/api/client'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import KanbanCard from './ui/KanbanCard'
import Task from './ui/Task'

export default function Dashboard() {
	const board = useBoardsStore(state => state.boards.find(item => item.id === state.activeId) || null)
	const { createTask, deleteTask, updateTask, createColumn, updateColumn, deleteColumn, setView } = useBoardsStore()
	const view = useBoardsStore(state => state.view)
	const loading = useBoardsStore(state => state.loading)
	const error = useBoardsStore(state => state.error)
	const members = useWorkspaceStore(state => state.members)
	const workspace = useWorkspaceStore(state => state.workspaces.find(item => item.id === state.activeId))
	const user = useAuthStore(state => state.user)
	const isManager = workspace?.role === 'owner' || workspace?.role === 'admin'
	const [columnTitle, setColumnTitle] = useState('')
	const [editingColumn, setEditingColumn] = useState(null)
	const [pendingColumn, setPendingColumn] = useState(null)
	const [targetColumn, setTargetColumn] = useState('')
	const [drafts, setDrafts] = useState({})
	const [savingDraft, setSavingDraft] = useState(null)
	const [openId, setOpenId] = useState(null)
	const [pendingDelete, setPendingDelete] = useState(null)
	const [actionError, setActionError] = useState('')
	const [checkingColumn, setCheckingColumn] = useState(false)
	const [deletingColumn, setDeletingColumn] = useState(false)
	const [deletingTask, setDeletingTask] = useState(false)
	const [searchParams, setSearchParams] = useSearchParams()
	const requestedTask = searchParams.get('task')

	useEffect(() => {
		setDrafts({})
		setPendingColumn(null)
		setPendingDelete(null)
		setEditingColumn(null)
		setOpenId(null)
		setActionError('')
	}, [board?.id])

	function closeTask() {
		setOpenId(null)
		if (requestedTask) {
			const next = new URLSearchParams(searchParams)
			next.delete('task')
			setSearchParams(next, { replace: true })
		}
	}

	function run(action) {
		setActionError('')
		Promise.resolve(action).catch(err => setActionError(err.message))
	}

	function submitColumn(event) {
		event.preventDefault()
		const title = columnTitle.trim()
		if (!title) return
		run(createColumn(title))
		setColumnTitle('')
	}

	async function beginColumnDelete(column) {
		setCheckingColumn(true)
		setTargetColumn('')
		setActionError('')
		try {
			const completeBoard = await api(`/boards/${board.id}?all_tasks=true`)
			const taskCount = completeBoard.tasks.filter(task => task.column_id === column.id).length
			if (useBoardsStore.getState().activeId !== board.id) return
			setPendingColumn({ ...column, taskCount })
		} catch (err) {
			setActionError(err.message)
		} finally {
			setCheckingColumn(false)
		}
	}

	async function confirmDeleteColumn() {
		if (!pendingColumn || !board || deletingColumn) return
		const remaining = board.columns.filter(column => column.id !== pendingColumn.id)
		if (pendingColumn.taskCount && remaining.length && !targetColumn) {
			return setActionError('Выберите колонку для переноса задач')
		}
		setDeletingColumn(true)
		setActionError('')
		try {
			await deleteColumn(pendingColumn.id, targetColumn || null, pendingColumn.taskCount > 0 && remaining.length === 0)
			setPendingColumn(null)
			setTargetColumn('')
		} catch (error) { setActionError(error.message) }
		finally { setDeletingColumn(false) }
	}

	async function confirmDeleteTask() {
		if (!pendingDelete || deletingTask) return
		setDeletingTask(true)
		setActionError('')
		try {
			await deleteTask(pendingDelete.id)
			setPendingDelete(null)
		} catch (error) { setActionError(error.message) }
		finally { setDeletingTask(false) }
	}

	function setDraft(columnId, changes) {
		setDrafts(current => ({ ...current, [columnId]: { title: '', error: '', ...current[columnId], ...changes } }))
	}

	function cancelDraft(columnId) {
		setDrafts(current => {
			const next = { ...current }
			delete next[columnId]
			return next
		})
	}

	async function saveDraft(event, columnId) {
		event.preventDefault()
		const title = drafts[columnId]?.title.trim()
		if (!title || savingDraft) return
		setSavingDraft(columnId)
		setActionError('')
		try {
			await createTask(title, columnId)
			cancelDraft(columnId)
		} catch (err) {
			setDraft(columnId, { error: err.message })
		} finally {
			setSavingDraft(null)
		}
	}

	const openTask = board?.tasks.find(task => task.id === (requestedTask || openId)) || null
	const openColumn = board?.columns.find(column => column.id === openTask?.column_id)
	const currentColumn = board?.columns.find(column => column.id === pendingColumn?.id)
	const deletingTaskCount = pendingColumn?.taskCount ?? 0
	const remainingColumns = board?.columns.filter(column => column.id !== pendingColumn?.id) ?? []

	if (loading) return <div className="px-8 py-12 text-center text-sm text-muted-foreground">Загрузка досок…</div>
	if (error) return <div className="px-8 py-12 text-center text-sm text-destructive">Не удалось загрузить доски: {error}</div>
	if (!board) return <div className="px-8 py-12 text-center text-sm text-muted-foreground">Создайте или выберите доску слева</div>

	return (
		<section className="flex min-h-[calc(100vh-120px)] min-w-0 flex-col gap-5 bg-background px-8 py-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-xl font-bold text-foreground">{board.title}</h2>
				{isManager ? <div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>Задачи</span>
					<SelectMenu
						ariaLabel="Показать задачи"
						value={view}
						onValueChange={next => run(setView(String(next)))}
						className="h-8 min-w-40 px-2.5 text-xs"
						options={[
							{ value: 'self', label: `Мои (${user?.login ?? 'я'})` },
							{ value: 'all', label: 'Все задачи' },
							...members.filter(member => member.user_id !== user?.id).map(member => ({ value: String(member.user_id), label: member.login })),
						]}
					/>
				</div> : null}
			</div>
			{isManager ? <form className="flex max-w-sm gap-2" onSubmit={submitColumn}>
				<Input placeholder="Новая колонка" value={columnTitle} onChange={event => setColumnTitle(event.target.value)} />
				<Button type="submit" variant="outline"><Plus />Колонка</Button>
			</form> : null}
			{actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
			<div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] items-start gap-4 pb-4">
				{board.columns.map((column, index) => {
					const tasks = board.tasks.filter(task => task.column_id === column.id)
					const draft = drafts[column.id]
					return <div key={column.id} className="flex min-h-48 min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted p-3.5">
						<div className="flex min-w-0 items-center gap-1 text-sm font-semibold text-secondary-foreground">
							{editingColumn?.id === column.id ? <form className="flex min-w-0 flex-1 gap-1" onSubmit={event => { event.preventDefault(); run(updateColumn(column.id, { title: editingColumn.title })); setEditingColumn(null) }}>
								<Input autoFocus className="h-7 text-xs" value={editingColumn.title} onChange={event => setEditingColumn({ ...editingColumn, title: event.target.value })} />
								<Button size="sm" type="submit">OK</Button>
							</form> : <span className="min-w-0 flex-1 truncate">{column.title}</span>}
							<span className="rounded-full bg-secondary px-2 py-0.5 text-[0.7rem]">{tasks.length}</span>
						</div>
						{isManager ? <div className="flex flex-wrap items-center gap-1">
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Переименовать колонку" onClick={() => setEditingColumn({ id: column.id, title: column.title })}><Pencil className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Передвинуть влево" disabled={!index} onClick={() => run(updateColumn(column.id, { position: index - 1 }))}><ChevronLeft className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Передвинуть вправо" disabled={index === board.columns.length - 1} onClick={() => run(updateColumn(column.id, { position: index + 1 }))}><ChevronRight className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Удалить колонку" disabled={checkingColumn} onClick={() => beginColumnDelete(column)}><Trash2 className="h-3 w-3" /></Button>
						</div> : null}
						<div className="flex min-w-0 flex-col gap-2.5">
							{tasks.map(task => <KanbanCard key={task.id} task={task} columns={board.columns} readOnly={!isManager} onOpen={() => setOpenId(task.id)} onDelete={() => setPendingDelete(task)} onMove={next => run(updateTask(task.id, { column_id: next }))} />)}
							{draft ? <form
								className="rounded-lg border border-primary/40 bg-card p-3 shadow-sm"
								onSubmit={event => saveDraft(event, column.id)}
								onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !draft.title.trim()) cancelDraft(column.id) }}
								onKeyDown={event => { if (event.key === 'Escape') cancelDraft(column.id) }}
							>
								<Input autoFocus aria-label="Название новой задачи" placeholder="Название задачи" value={draft.title} onChange={event => setDraft(column.id, { title: event.target.value })} className="mb-2 h-auto border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0" />
								<p className="mb-3 text-[0.7rem] text-muted-foreground">Новая задача · {column.title}</p>
								{draft.error ? <p className="mb-2 text-xs text-destructive">{draft.error}</p> : null}
								<div className="flex justify-end gap-1">
									<Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Отменить создание" onClick={() => cancelDraft(column.id)}><X className="h-4 w-4" /></Button>
									<Button type="submit" size="icon" className="h-7 w-7" aria-label="Сохранить задачу" disabled={!draft.title.trim() || savingDraft !== null}><Check className="h-4 w-4" /></Button>
								</div>
							</form> : null}
						</div>
						{isManager && !draft ? <Button type="button" variant="ghost" className="w-full justify-start text-xs text-muted-foreground" onClick={() => setDraft(column.id, { title: '', error: '' })}><Plus className="h-3.5 w-3.5" />Добавить задачу</Button> : null}
					</div>
				})}
			</div>
			<Dialog open={Boolean(openTask)} onOpenChange={open => !open && closeTask()}>
				<DialogContent showClose={false} className="max-w-2xl border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
					{openTask ? <Task key={openTask.id} task={openTask} columnTitle={openColumn?.title} readOnly={!isManager} onClose={closeTask} onChange={changes => updateTask(openTask.id, changes)} /> : null}
				</DialogContent>
			</Dialog>
			<Dialog open={Boolean(pendingDelete)} onOpenChange={next => { if (!next && !deletingTask) setPendingDelete(null) }}>
				<DialogContent showClose={false}>
					<DialogHeader>
						<DialogTitle>Удалить задачу?</DialogTitle>
						<DialogDescription>{pendingDelete ? `«${pendingDelete.title}» будет удалена без возможности восстановления.` : ''}</DialogDescription>
					</DialogHeader>
					{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
					<DialogFooter>
						<Button type="button" variant="outline" disabled={deletingTask} onClick={() => setPendingDelete(null)}>Отмена</Button>
						<Button type="button" variant="destructive" disabled={deletingTask} onClick={confirmDeleteTask}>Удалить</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={Boolean(pendingColumn)} onOpenChange={next => { if (!next && !deletingColumn) setPendingColumn(null) }}>
				<DialogContent showClose={false}>
					<DialogHeader>
						<DialogTitle>Удалить колонку «{currentColumn?.title}»?</DialogTitle>
						<DialogDescription>
							{deletingTaskCount && !remainingColumns.length
								? `В колонке задач: ${deletingTaskCount}. Все они будут удалены вместе с ней.`
								: deletingTaskCount
									? `Задач в колонке: ${deletingTaskCount}. Выберите колонку для переноса.`
									: 'Колонка будет удалена.'}
						</DialogDescription>
					</DialogHeader>
					{deletingTaskCount > 0 && remainingColumns.length > 0 ? <div className="space-y-2 text-sm">
						<span className="text-muted-foreground">Куда перенести задачи</span>
						<SelectMenu
							ariaLabel="Колонка для переноса задач"
							value={targetColumn}
							onValueChange={value => setTargetColumn(String(value))}
							className="w-full"
							options={[{ value: '', label: 'Выберите колонку' }, ...remainingColumns.map(column => ({ value: column.id, label: column.title }))]}
						/>
					</div> : null}
					{actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
					<DialogFooter>
						<Button type="button" variant="outline" disabled={deletingColumn} onClick={() => setPendingColumn(null)}>Отмена</Button>
						<Button type="button" variant="destructive" disabled={checkingColumn || deletingColumn || (deletingTaskCount > 0 && remainingColumns.length > 0 && !targetColumn)} onClick={confirmDeleteColumn}>
							{deletingTaskCount && !remainingColumns.length ? 'Удалить колонку и задачи' : 'Удалить колонку'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	)
}
