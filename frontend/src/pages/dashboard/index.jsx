import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
import KanbanColumn from './ui/KanbanColumn'
import KanbanLayout from './ui/KanbanLayout'
import Task from './ui/Task'

export default function Dashboard() {
	const board = useBoardsStore(state => state.boards.find(item => item.id === state.activeId) || null)
	const createTask = useBoardsStore(state => state.createTask)
	const deleteTask = useBoardsStore(state => state.deleteTask)
	const updateTask = useBoardsStore(state => state.updateTask)
	const createColumn = useBoardsStore(state => state.createColumn)
	const updateColumn = useBoardsStore(state => state.updateColumn)
	const deleteColumn = useBoardsStore(state => state.deleteColumn)
	const setView = useBoardsStore(state => state.setView)
	const moveTask = useBoardsStore(state => state.moveTask)
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

	const run = useCallback(action => {
		setActionError('')
		Promise.resolve(action).catch(err => setActionError(err.message))
	}, [])

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

	if (loading && !board) return <div className="px-8 py-12 text-center text-sm text-muted-foreground">Загрузка досок…</div>
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
			<KanbanLayout>
                {board.columns.map((column, index) => <KanbanColumn key={column.id}
                    column={column} index={index} columns={board.columns}
                    tasks={board.tasks.filter(task => task.column_id === column.id)} draft={drafts[column.id]}
                    editingColumn={editingColumn?.id === column.id ? editingColumn : null}
                    isManager={isManager} user={user} run={run} updateColumn={updateColumn}
                    setEditingColumn={setEditingColumn} checkingColumn={checkingColumn}
                    beginColumnDelete={beginColumnDelete} setOpenId={setOpenId} setPendingDelete={setPendingDelete}
                    moveTask={moveTask} saveDraft={saveDraft} cancelDraft={cancelDraft} setDraft={setDraft} savingDraft={savingDraft}
                />)}
			</KanbanLayout>
			<Dialog open={Boolean(openTask)} onOpenChange={open => !open && closeTask()}>
				<DialogContent showClose={false} className="max-w-2xl border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
					{openTask ? <Task key={openTask.id} task={openTask} columnTitle={openColumn?.title} columns={board.columns} canMove={isManager || openTask.assignee_id === user?.id} onMove={next => moveTask(openTask.id, next)} canEdit={isManager} onClose={closeTask} onChange={changes => updateTask(openTask.id, changes)} /> : null}
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
