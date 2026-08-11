import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FileText, LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function Sidebar() {
	const location = useLocation()
	const isDocs = location.pathname.startsWith('/documents')
	const userLogin = useAuthStore(state => state.user?.login ?? '')

	const boards = useBoardsStore(state => state.boards)
	const activeBoardId = useBoardsStore(state => state.activeId)
	const createBoard = useBoardsStore(state => state.createBoard)
	const selectBoard = useBoardsStore(state => state.selectBoard)
	const deleteBoard = useBoardsStore(state => state.deleteBoard)

	const documents = useDocumentsStore(state => state.documents)
	const activeDocId = useDocumentsStore(state => state.activeId)
	const createDocument = useDocumentsStore(state => state.createDocument)
	const selectDocument = useDocumentsStore(state => state.selectDocument)
	const deleteDocument = useDocumentsStore(state => state.deleteDocument)

	const [adding, setAdding] = useState(false)
	const [title, setTitle] = useState('')
	const [pendingDelete, setPendingDelete] = useState(null)

	useEffect(() => {
		setAdding(false)
		setTitle('')
		setPendingDelete(null)
	}, [isDocs])

	function submit(e) {
		e.preventDefault()
		const value = title.trim()
		if (!value) return
		if (isDocs) createDocument(value, userLogin)
		else createBoard(value)
		setTitle('')
		setAdding(false)
	}

	function confirmDelete() {
		if (!pendingDelete) return
		if (isDocs) deleteDocument(pendingDelete.id)
		else deleteBoard(pendingDelete.id)
		setPendingDelete(null)
	}

	const items = isDocs ? documents : boards
	const activeId = isDocs ? activeDocId : activeBoardId

	return (
		<aside className="flex w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 animate-in slide-in-from-left-2 duration-300">
			<nav className="mb-3 grid grid-cols-2 gap-1.5">
				<NavLink
					to="/dashboard"
					className={({ isActive }) =>
						cn(
							'flex items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground',
							isActive && 'border-primary/25 bg-accent text-foreground'
						)
					}
				>
					<LayoutGrid className="h-3.5 w-3.5" />
					Доски
				</NavLink>
				<NavLink
					to="/documents"
					className={({ isActive }) =>
						cn(
							'flex items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground',
							isActive && 'border-primary/25 bg-accent text-foreground'
						)
					}
				>
					<FileText className="h-3.5 w-3.5" />
					Документы
				</NavLink>
			</nav>

			{adding ? (
				<form onSubmit={submit}>
					<Input
						placeholder={isDocs ? 'Название документа' : 'Название доски'}
						value={title}
						autoFocus
						onChange={e => setTitle(e.target.value)}
						onBlur={() => !title.trim() && setAdding(false)}
						className="border-primary ring-1 ring-primary/30"
					/>
				</form>
			) : (
				<Button className="w-full justify-start" onClick={() => setAdding(true)}>
					<Plus />
					{isDocs ? 'Создать документ' : 'Создать доску'}
				</Button>
			)}

			<Separator className="my-4" />

			<ul className="flex flex-col gap-1">
				{items.map(item => (
					<li key={item.id}>
						<button
							type="button"
							onClick={() => (isDocs ? selectDocument(item.id) : selectBoard(item.id))}
							className={cn(
								'group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:translate-x-0.5 hover:bg-accent hover:text-foreground',
								item.id === activeId && 'bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]'
							)}
						>
							<span className="truncate">{item.title}</span>
							<span
								role="button"
								tabIndex={0}
								aria-label={isDocs ? 'Удалить документ' : 'Удалить доску'}
								className="rounded p-1 text-muted-foreground opacity-50 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
								onClick={e => {
									e.stopPropagation()
									setPendingDelete(item)
								}}
								onKeyDown={e => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										e.stopPropagation()
										setPendingDelete(item)
									}
								}}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</span>
						</button>
					</li>
				))}
			</ul>

			<ConfirmDialog
					open={Boolean(pendingDelete)}
					title={isDocs ? 'Удалить документ?' : 'Удалить доску?'}
					text={
						pendingDelete
							? isDocs
								? `«${pendingDelete.title}» будет удалён вместе со всеми версиями.`
								: `«${pendingDelete.title}» будет удалена вместе со всеми задачами.`
							: ''
					}
					onConfirm={confirmDelete}
					onCancel={() => setPendingDelete(null)}
				/>
		</aside>
	)
}
