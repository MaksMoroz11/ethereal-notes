import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, FileText, Filter, Folder, LayoutGrid, Pencil, Plus, ScrollText, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { useFoldersStore } from '@/shared/store/foldersStore'
import FolderTree from './FolderTree'
import SearchBox from './SearchBox'
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

const ACTIVITY_ACTIONS = [
	{ value: 'all', label: 'Все действия' },
	{ value: 'Создание', label: 'Создание' },
	{ value: 'Изменение', label: 'Изменение' },
	{ value: 'Удаление', label: 'Удаление' },
	{ value: 'Версионирование', label: 'Версионирование' },
	{ value: 'Откат', label: 'Откат' },
	{ value: 'Участники', label: 'Участники' },
]

const ACTIVITY_ENTITIES = [
	{ value: 'all', label: 'Все сущности' },
	{ value: 'workspace', label: 'Пространство' },
	{ value: 'board', label: 'Доска' },
	{ value: 'task', label: 'Задача' },
	{ value: 'document', label: 'Документ' },
	{ value: 'folder', label: 'Папка' },
	{ value: 'member', label: 'Участник' },
]

const ACTIVITY_PERIODS = [
	{ value: 'all', label: 'За всё время' },
	{ value: 'today', label: 'Сегодня' },
	{ value: 'week', label: 'Последние 7 дней' },
]

function SidebarFilterMenu({ label, value, options, onChange }) {
	const current = options.find(option => option.value === value)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type="button" aria-label={label} className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-2.5 text-xs text-foreground transition hover:bg-accent">
					<span className="truncate">{current?.label}</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-52">
				{options.map(option => (
					<DropdownMenuItem key={option.value} onSelect={() => onChange(option.value)}>
						{option.label}
						{option.value === value ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export default function Sidebar({ mobileOpen = false, onClose }) {
	const location = useLocation()
	const [searchParams, setSearchParams] = useSearchParams()
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
	const moveBoard = useBoardsStore(state => state.moveBoard)

	const documents = useDocumentsStore(state => state.documents)
	const activeDocId = useDocumentsStore(state => state.activeId)
	const createDocument = useDocumentsStore(state => state.createDocument)
	const selectDocument = useDocumentsStore(state => state.selectDocument)
	const deleteDocument = useDocumentsStore(state => state.deleteDocument)
	const moveDocument = useDocumentsStore(state => state.moveDocument)
	const boardFolders = useFoldersStore(state => state.boardFolders)
	const documentFolders = useFoldersStore(state => state.documentFolders)
	const foldersError = useFoldersStore(state => state.error)
	const createFolder = useFoldersStore(state => state.createFolder)

	const [adding, setAdding] = useState(null)
	const [title, setTitle] = useState('')
	const [pendingDelete, setPendingDelete] = useState(null)
	const [pendingMemberRemove, setPendingMemberRemove] = useState(null)
	const [inviteLogin, setInviteLogin] = useState('')
	const [inviting, setInviting] = useState(false)
	const [workspaceAction, setWorkspaceAction] = useState(null)
	const [workspaceName, setWorkspaceName] = useState('')
	const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
	const [actionError, setActionError] = useState('')
	const workspaceInputRef = useRef(null)
	const activitySearch = searchParams.get('search') || ''
	const activityUser = searchParams.get('user') || ''
	const activityAction = searchParams.get('action') || 'all'
	const activityEntity = searchParams.get('entity') || 'all'
	const activityPeriod = searchParams.get('period') || 'all'

	const currentWorkspace = workspaces.find(item => item.id === activeWorkspaceId) || null
	const isOwner = currentWorkspace?.role === 'owner'
	const isManager = isOwner || currentWorkspace?.role === 'admin'
	const canDeleteWorkspace = isOwner && workspaces.filter(item => item.role === 'owner').length > 1

	useEffect(() => {
		setAdding(null)
		setTitle('')
		setPendingDelete(null)
		setPendingMemberRemove(null)
	}, [isDocs, activeWorkspaceId])

	useEffect(() => {
		onClose?.()
	}, [location.pathname, onClose])

	useEffect(() => {
		if (!workspaceAction) return undefined
		const frame = requestAnimationFrame(() => workspaceInputRef.current?.focus())
		return () => cancelAnimationFrame(frame)
	}, [workspaceAction])

	async function handleSelectWorkspace(id) {
		setActionError('')
		try {
			await selectWorkspace(id)
		} catch (error) {
			setActionError(error.message)
		}
	}

	function beginWorkspaceAction(action) {
		setWorkspaceAction(action)
		setWorkspaceName(action === 'rename' ? currentWorkspace?.name ?? '' : '')
	}

	function updateActivityFilter(key, value) {
		const next = new URLSearchParams(searchParams)
		if (!value || value === 'all') next.delete(key)
		else next.set(key, value)
		setSearchParams(next)
	}

	function resetActivityFilters() {
		const next = new URLSearchParams(searchParams)
		for (const key of ['search', 'user', 'action', 'entity', 'period']) next.delete(key)
		setSearchParams(next)
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

	async function submit(e) {
		e.preventDefault()
		setActionError('')
		const value = title.trim()
		if (!value) return
		try {
			if (adding === 'folder') await createFolder(value, null, isDocs ? 'document' : 'board')
			else if (isDocs) await createDocument(value)
			else await createBoard(value)
			setTitle('')
			setAdding(null)
		} catch (error) {
			setActionError(error.message)
		}
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

	async function confirmMemberRemove() {
		if (!pendingMemberRemove) return
		setActionError('')
		try {
			await removeMember(pendingMemberRemove.user_id)
			setPendingMemberRemove(null)
		} catch (error) {
			setActionError(error.message)
		}
	}

		const items = isDocs ? documents : boards
	const activeId = isDocs ? activeDocId : activeBoardId

	return (
		<aside
			className={cn(
				'flex min-h-0 w-[280px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar p-3 animate-in slide-in-from-left-2 duration-300',
				'max-md:fixed max-md:top-[69px] max-md:bottom-0 max-md:left-0 max-md:z-50 max-md:h-auto max-md:shadow-2xl max-md:transition-transform max-md:duration-300',
				mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
			)}
		>
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
						ref={workspaceInputRef}
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

			{foldersError ? <p className="mb-3 text-xs text-destructive">{foldersError}</p> : null}
			{activeWorkspaceId ? <SearchBox key={activeWorkspaceId} workspaceId={activeWorkspaceId} boardFolders={boardFolders} documentFolders={documentFolders} /> : null}
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

			{isActivity ? (
				<div className="mb-3 space-y-2 rounded-lg border border-border bg-card/40 p-2">
					<div className="flex items-center gap-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
						<Filter className="h-3.5 w-3.5" />
						Фильтры журнала
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={activitySearch}
							onChange={event => updateActivityFilter('search', event.target.value)}
							placeholder="Поиск по названию"
							className="h-8 pl-8 text-xs"
						/>
					</div>
					<Input
						value={activityUser}
						onChange={event => updateActivityFilter('user', event.target.value)}
						placeholder="Пользователь"
						className="h-8 text-xs"
					/>
					<SidebarFilterMenu label="Действие" value={activityAction} options={ACTIVITY_ACTIONS} onChange={value => updateActivityFilter('action', value)} />
					<SidebarFilterMenu label="Сущность" value={activityEntity} options={ACTIVITY_ENTITIES} onChange={value => updateActivityFilter('entity', value)} />
					<SidebarFilterMenu label="Период" value={activityPeriod} options={ACTIVITY_PERIODS} onChange={value => updateActivityFilter('period', value)} />
					<button type="button" onClick={resetActivityFilters} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
						Сбросить фильтры
					</button>
				</div>
			) : null}

				{isActivity || !isManager ? null : adding ? (
				<form onSubmit={submit}>
					<Input
						placeholder={adding === 'folder' ? 'Название папки' : isDocs ? 'Название документа' : 'Название доски'}
						value={title}
						autoFocus
						onChange={e => setTitle(e.target.value)}
						onBlur={() => !title.trim() && setAdding(null)}
						className="border-primary ring-1 ring-primary/30"
					/>
				</form>
			) : (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" className="w-full justify-start"><Plus />Создать</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-[256px]">
						<DropdownMenuItem onSelect={() => { setTitle(''); setAdding('item') }}>{isDocs ? <FileText /> : <LayoutGrid />}Создать {isDocs ? 'документ' : 'доску'}</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => { setTitle(''); setAdding('folder') }}><Folder />Создать папку</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{isActivity ? <div className="flex-1" /> : <Separator className="my-4" />}

			{isActivity ? null : (
			<FolderTree key={`${activeWorkspaceId}-${isDocs}`} folders={isDocs ? documentFolders : boardFolders} items={items} isDocs={isDocs} isManager={isManager} activeId={activeId} onSelect={isDocs ? selectDocument : selectBoard} onCreateItem={isDocs ? createDocument : createBoard} onMoveItem={isDocs ? moveDocument : moveBoard} onDeleteItem={setPendingDelete} />
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
							<span className="min-w-0 truncate font-medium text-secondary-foreground">{member.login}</span>
							<div className="flex shrink-0 items-center gap-1">
								{isOwner && member.role !== 'owner' ? (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button type="button" className="text-[0.65rem] uppercase tracking-wide hover:text-foreground">
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
									<span className="text-[0.65rem] uppercase tracking-wide">
										{member.role === 'owner' ? 'владелец' : member.role === 'admin' ? 'администратор' : 'участник'}
									</span>
								)}
								{isManager && member.role !== 'owner' && !(currentWorkspace?.role === 'admin' && member.role === 'admin') ? (
									<button
										type="button"
										className="rounded p-0.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
										aria-label={`Удалить ${member.login}`}
									onClick={() => setPendingMemberRemove(member)}
									>
										<X className="h-3 w-3" />
									</button>
								) : null}
							</div>
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
			<ConfirmDialog
				open={Boolean(pendingMemberRemove)}
				title="Удалить участника?"
				text={pendingMemberRemove ? `«${pendingMemberRemove.login}» будет удалён из пространства.` : ''}
				onConfirm={confirmMemberRemove}
				onCancel={() => setPendingMemberRemove(null)}
			/>
		</aside>
	)
}
