import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Check, ChevronDown, FileText, LayoutGrid, Pencil, Plus, ScrollText, Trash2, UserPlus, X } from 'lucide-react'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function Sidebar() {
	const location = useLocation()
	const isDocs = location.pathname.startsWith('/documents')
	const isActivity = location.pathname.startsWith('/activity')

	const workspaces = useWorkspaceStore(state => state.workspaces)
	const activeWorkspaceId = useWorkspaceStore(state => state.activeId)
	const members = useWorkspaceStore(state => state.members)
	const inviteError = useWorkspaceStore(state => state.inviteError)
	const workspaceError = useWorkspaceStore(state => state.error)
	const selectWorkspace = useWorkspaceStore(state => state.selectWorkspace)
	const createWorkspace = useWorkspaceStore(state => state.createWorkspace)
	const renameWorkspace = useWorkspaceStore(state => state.renameWorkspace)
	const deleteWorkspace = useWorkspaceStore(state => state.deleteWorkspace)
	const inviteMember = useWorkspaceStore(state => state.inviteMember)
	const removeMember = useWorkspaceStore(state => state.removeMember)
	const updateMemberRole = useWorkspaceStore(state => state.updateMemberRole)

	const boards = useBoardsStore(state => state.boards)
	const activeBoardId = useBoardsStore(state => state.activeId)
	const createBoard = useBoardsStore(state => state.createBoard)
	const selectBoard = useBoardsStore(state => state.selectBoard)
	const deleteBoard = useBoardsStore(state => state.deleteBoard)
	const loadBoards = useBoardsStore(state => state.loadBoards)

	const documents = useDocumentsStore(state => state.documents)
	const activeDocId = useDocumentsStore(state => state.activeId)
	const createDocument = useDocumentsStore(state => state.createDocument)
	const selectDocument = useDocumentsStore(state => state.selectDocument)
	const deleteDocument = useDocumentsStore(state => state.deleteDocument)
	const loadDocuments = useDocumentsStore(state => state.loadDocuments)

	const [adding, setAdding] = useState(false)
	const [title, setTitle] = useState('')
	const [pendingDelete, setPendingDelete] = useState(null)
	const [inviteLogin, setInviteLogin] = useState('')
	const [inviting, setInviting] = useState(false)
	const [workspaceAction, setWorkspaceAction] = useState(null)
	const [workspaceName, setWorkspaceName] = useState('')
	const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
	const [actionError, setActionError] = useState('')

	const currentWorkspace = workspaces.find(item => item.id === activeWorkspaceId) || null
	const isOwner = currentWorkspace?.role === 'owner'
	const isManager = isOwner || currentWorkspace?.role === 'admin'
	const canDeleteWorkspace = isOwner && workspaces.filter(item => item.role === 'owner').length > 1

	useEffect(() => {
		setAdding(false)
		setTitle('')
		setPendingDelete(null)
	}, [isDocs])

	async function handleSelectWorkspace(id) {
		setActionError('')
		try {
			await selectWorkspace(id)
			await Promise.all([loadBoards(id), loadDocuments(id)])
		} catch (error) {
			setActionError(error.message)
		}
	}

	function beginWorkspaceAction(action) {
		setWorkspaceAction(action)
		setWorkspaceName(action === 'rename' ? currentWorkspace?.name ?? '' : '')
	}

	async function submitWorkspace(e) {
		e.preventDefault()
		setActionError('')
		const value = workspaceName.trim()
		if (!value) return
		try {
			if (workspaceAction === 'create') await createWorkspace(value)
			if (workspaceAction === 'rename') await renameWorkspace(value)
			setWorkspaceAction(null)
			setWorkspaceName('')
		} catch (error) {
			setActionError(error.message)
		}
	}

	async function confirmWorkspaceDelete() {
		try {
			await deleteWorkspace()
			setDeleteWorkspaceOpen(false)
		} catch (error) {
			setActionError(error.message)
		}
	}

	function submit(e) {
		e.preventDefault()
		setActionError('')
		const value = title.trim()
		if (!value) return
		const action = isDocs ? createDocument(value) : createBoard(value)
		action.then(() => {
			setTitle('')
			setAdding(false)
		}).catch(error => setActionError(error.message))
	}

	function confirmDelete() {
		if (!pendingDelete) return
		setActionError('')
		const action = isDocs ? deleteDocument(pendingDelete.id) : deleteBoard(pendingDelete.id)
		action.then(() => setPendingDelete(null)).catch(error => setActionError(error.message))
	}

	async function submitInvite(e) {
		e.preventDefault()
		const value = inviteLogin.trim()
		if (!value) return
		setInviting(true)
		try {
			await inviteMember(value)
			setInviteLogin('')
		} catch {
			return
		} finally {
			setInviting(false)
		}
	}

	const items = isDocs ? documents : boards
	const activeId = isDocs ? activeDocId : activeBoardId

	return (
		<aside className="flex min-h-0 w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 animate-in slide-in-from-left-2 duration-300">
			{workspaces.length > 0 ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							className="mb-3 h-9 w-full justify-between px-2.5 text-xs font-medium"
							aria-label="Рабочее пространство"
						>
							<span className="truncate">{currentWorkspace?.name ?? 'Пространство'}</span>
							<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-[256px]">
						{workspaces.map(item => (
							<DropdownMenuItem
								key={item.id}
								className="text-xs"
								onClick={() => handleSelectWorkspace(item.id)}
							>
								<span className="truncate">{item.name}</span>
								{item.id === activeWorkspaceId ? <Check className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-xs" onClick={() => beginWorkspaceAction('create')}>
							<Plus />
							Новое пространство
						</DropdownMenuItem>
						{isOwner ? (
							<>
								<DropdownMenuItem className="text-xs" onClick={() => beginWorkspaceAction('rename')}>
									<Pencil />
									Переименовать
								</DropdownMenuItem>
								{canDeleteWorkspace ? (
									<DropdownMenuItem className="text-xs text-destructive" onClick={() => setDeleteWorkspaceOpen(true)}>
										<Trash2 />
										Удалить пространство
									</DropdownMenuItem>
								) : null}
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}

			{workspaceAction ? (
				<form className="mb-3 flex gap-1.5" onSubmit={submitWorkspace}>
					<Input
						value={workspaceName}
						onChange={e => setWorkspaceName(e.target.value)}
						placeholder="Название пространства"
						autoFocus
						className="h-8 text-xs"
					/>
					<Button type="submit" size="icon" className="h-8 w-8 shrink-0" aria-label="Сохранить пространство">
						<Check />
					</Button>
					<Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Отмена" onClick={() => setWorkspaceAction(null)}>
						<X />
					</Button>
				</form>
			) : null}
			{(workspaceError || actionError) && (
				<p className="mb-3 text-xs text-destructive">{workspaceError || actionError}</p>
			)}

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
				<NavLink
					to="/activity"
					className={({ isActive }) =>
						cn(
							'col-span-2 flex items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground',
							isActive && 'border-primary/25 bg-accent text-foreground'
						)
					}
				>
					<ScrollText className="h-3.5 w-3.5" />
					Журнал
				</NavLink>
			</nav>

			{isActivity ? null : adding ? (
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

			{isActivity ? <div className="flex-1" /> : <Separator className="my-4" />}

			{isActivity ? null : (
			<ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
				{items.map(item => (
					<li key={item.id}>
						<button
							type="button"
							onClick={() => (isDocs ? selectDocument(item.id) : selectBoard(item.id))}
							className={cn(
								'group relative flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground',
								'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity hover:before:opacity-70',
								item.id === activeId && 'bg-primary/30 font-medium text-foreground hover:bg-primary/45 before:opacity-100 hover:before:opacity-100'
							)}
						>
							<span className="truncate">{item.title}</span>
							{isOwner ? (
								<span
									role="button"
									tabIndex={0}
									aria-label={isDocs ? 'Удалить документ' : 'Удалить доску'}
									className={cn(
										'rounded-md p-1 transition hover:bg-destructive/15 hover:text-destructive',
										item.id === activeId
											? 'text-destructive'
											: 'text-muted-foreground opacity-40 group-hover:opacity-100'
									)}
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
							) : null}
						</button>
					</li>
				))}
			</ul>
			)}

			<Separator className="my-4" />

			<div className="flex flex-col gap-2">
				<span className="px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
					Участники
				</span>
				<ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
					{members.map(member => (
						<li
							key={member.user_id}
							className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
						>
							<span className="truncate font-medium text-secondary-foreground">{member.login}</span>
							{isOwner && member.role !== 'owner' ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button type="button" className="shrink-0 text-[0.65rem] uppercase tracking-wide hover:text-foreground">
											{member.role === 'admin' ? 'администратор' : 'участник'}
											<ChevronDown className="ml-0.5 inline h-2.5 w-2.5" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => updateMemberRole(member.user_id, 'admin')}>Администратор</DropdownMenuItem>
										<DropdownMenuItem onClick={() => updateMemberRole(member.user_id, 'member')}>Участник</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : (
								<span className="shrink-0 text-[0.65rem] uppercase tracking-wide">
									{member.role === 'owner' ? 'владелец' : member.role === 'admin' ? 'администратор' : 'участник'}
								</span>
							)}
							{isManager && member.role !== 'owner' && !(currentWorkspace?.role === 'admin' && member.role === 'admin') ? (
								<button
									type="button"
									className="rounded p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
									aria-label={`Удалить ${member.login}`}
									onClick={() => removeMember(member.user_id)}
								>
									<X className="h-3 w-3" />
								</button>
							) : null}
						</li>
					))}
				</ul>
				{isManager ? (
					<form className="flex flex-col gap-1.5" onSubmit={submitInvite}>
						<div className="flex gap-1.5">
							<Input
								placeholder="Логин"
								value={inviteLogin}
								onChange={e => setInviteLogin(e.target.value)}
								className="h-8 text-xs"
							/>
							<Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={inviting} aria-label="Пригласить">
								<UserPlus className="h-3.5 w-3.5" />
							</Button>
						</div>
						{inviteError ? <p className="px-1 text-[0.7rem] text-destructive">{inviteError}</p> : null}
					</form>
				) : null}
			</div>

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
			<ConfirmDialog
				open={deleteWorkspaceOpen}
				title="Удалить пространство?"
				text={currentWorkspace ? `«${currentWorkspace.name}» будет удалено вместе со всеми досками, задачами и документами.` : ''}
				onConfirm={confirmWorkspaceDelete}
				onCancel={() => setDeleteWorkspaceOpen(false)}
			/>
		</aside>
	)
}
