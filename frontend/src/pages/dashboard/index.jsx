import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useBoardsStore } from '@/shared/store/boardsStore'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
} from '@/components/ui/dialog'
import KanbanCard from './ui/KanbanCard'
import Task from './ui/Task'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

export default function Dashboard() {
	const board = useBoardsStore(state => state.boards.find(b => b.id === state.activeId) || null)
	const createTask = useBoardsStore(state => state.createTask)
	const deleteTask = useBoardsStore(state => state.deleteTask)
	const updateTask = useBoardsStore(state => state.updateTask)
	const loading = useBoardsStore(state => state.loading)
	const error = useBoardsStore(state => state.error)
	const [taskTitle, setTaskTitle] = useState('')
	const [openId, setOpenId] = useState(null)
	const [pendingDelete, setPendingDelete] = useState(null)
	const [actionError, setActionError] = useState('')

	if (loading) {
		return <div className="px-8 py-12 text-center text-sm text-muted-foreground">Загрузка досок…</div>
	}

	if (error) {
		return <div className="px-8 py-12 text-center text-sm text-destructive">Не удалось загрузить доски: {error}</div>
	}

	if (!board) {
		return (
			<div className="px-8 py-12 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
				Создайте или выберите доску слева
			</div>
		)
	}

	function submitTask(e) {
		e.preventDefault()
		setActionError('')
		const value = taskTitle.trim()
		if (!value) return
		createTask(value).catch(error => setActionError(error.message))
		setTaskTitle('')
	}

	function confirmDelete() {
		if (!pendingDelete) return
		if (openId === pendingDelete.id) setOpenId(null)
		deleteTask(pendingDelete.id).catch(error => setActionError(error.message))
		setPendingDelete(null)
	}

	const openTask = board.tasks.find(task => task.id === openId) || null

	return (
		<section className="flex min-h-[calc(100vh-120px)] flex-col gap-5 bg-background px-8 py-6 animate-in fade-in duration-300">
			<h2 className="text-xl font-bold text-foreground animate-in fade-in slide-in-from-bottom-2 duration-400">
				{board.title}
			</h2>

			<form className="flex max-w-md gap-2" onSubmit={submitTask}>
				<Input
					placeholder="Новая задача"
					value={taskTitle}
					onChange={e => setTaskTitle(e.target.value)}
				/>
				<Button type="submit">
					<Plus />
					Добавить
				</Button>
			</form>
			{actionError && <p className="max-w-md text-sm text-destructive">{actionError}</p>}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{STATUSES.map((status, index) => {
					const tasks = board.tasks.filter(task => task.status === status)
					return (
						<div
							key={status}
							className="flex min-h-50 flex-col gap-3 rounded-xl border border-border bg-muted p-3.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
							style={{ animationDelay: `${index * 50 + 50}ms` }}
						>
							<div className="flex items-center justify-between text-sm font-semibold text-secondary-foreground">
								<span>{status}</span>
								<span className="rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] text-muted-foreground">
									{tasks.length}
								</span>
							</div>
							<div className="flex flex-col gap-2.5">
								{tasks.map(task => (
									<KanbanCard
										key={task.id}
										task={task}
										onOpen={() => setOpenId(task.id)}
										onDelete={() => setPendingDelete(task)}
									onMove={next => updateTask(task.id, { status: next }).catch(error => setActionError(error.message))}
									/>
								))}
							</div>
						</div>
					)
				})}
			</div>

			<Dialog open={Boolean(openTask)} onOpenChange={open => !open && setOpenId(null)}>
				<DialogContent showClose={false} className="max-w-2xl border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
					{openTask ? (
						<Task
							task={openTask}
							onClose={() => setOpenId(null)}
							onChange={changes => updateTask(openTask.id, changes)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<ConfirmDialog
				open={Boolean(pendingDelete)}
				title="Удалить задачу?"
				text={
					pendingDelete
						? `«${pendingDelete.title}» будет удалена без возможности восстановления.`
						: ''
				}
				onConfirm={confirmDelete}
				onCancel={() => setPendingDelete(null)}
			/>
		</section>
	)
}
