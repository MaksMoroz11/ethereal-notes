import { useEffect, useRef, useState } from 'react'
import {
	ChevronDown,
	ChevronRight,
	Ellipsis,
	FileText,
	Folder,
	FolderInput,
	LayoutGrid,
	Pencil,
	Plus,
	Trash2,
} from 'lucide-react'
import { useFoldersStore } from '@/shared/store/foldersStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SelectMenu from '@/components/ui/select-menu'
import { cn } from '@/lib/utils'
import ConfirmDialog from '@/shared/ui/ConfirmDialog/ConfirmDialog'
import { folderSubtree } from '@/shared/lib/folderTree'
import { hierarchyText } from '@/shared/messages/workspaces'
import { getSessionVersion } from '@/shared/api/client'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'

const DRAG_TYPE = 'application/x-ethereal-folder-item'

function HierarchyActions({ label, disabled, children }) {
	const trigger = useRef(null)
	const [placement, setPlacement] = useState({})
	return <DropdownMenu onOpenChange={open => {
		if (open) {
			const rect = trigger.current.getBoundingClientRect()
			setPlacement({ height: Math.max(1, window.innerHeight - rect.bottom - 14), offset: Math.min(20, window.innerWidth - rect.left - 208 - 8) })
		}
	}}>
		<DropdownMenuTrigger asChild>
			<button ref={trigger} type="button" disabled={disabled} draggable={false} onDragStart={event => { event.preventDefault(); event.stopPropagation() }} aria-label={label} className="mr-1 rounded p-1 text-muted-foreground opacity-100 transition hover:bg-accent-foreground/10 hover:text-foreground focus-visible:opacity-100 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
				<Ellipsis className="h-3.5 w-3.5" />
			</button>
		</DropdownMenuTrigger>
		<DropdownMenuContent side="bottom" align="start" alignOffset={placement.offset ?? 20} sideOffset={6} avoidCollisions={false} style={{ maxHeight: placement.height }} className="w-52 min-w-0 max-w-[calc(100vw-16px)] overflow-y-auto">
			{children}
		</DropdownMenuContent>
	</DropdownMenu>
}

export default function FolderTree({ folders, items, isDocs, isManager, activeId, onSelect, onCreateItem, onMoveItem, onDeleteItem }) {
	const createFolder = useFoldersStore(state => state.createFolder)
	const updateFolder = useFoldersStore(state => state.updateFolder)
	const deleteFolder = useFoldersStore(state => state.deleteFolder)
	const kind = isDocs ? 'document' : 'board'
	const [open, setOpen] = useState({})
	const [editing, setEditing] = useState(null)
	const [value, setValue] = useState('')
	const [error, setError] = useState('')
	const [dragging, setDragging] = useState(null)
	const [dropTarget, setDropTarget] = useState(null)
	const [moving, setMoving] = useState(null)
	const drag = useRef(null)
	const movePending = useRef(false)
	const hoverTimer = useRef(null)
	const hoverFolder = useRef(null)
	const scroll = useRef(null)
	const mounted = useRef(true)
	const [pendingDelete, setPendingDelete] = useState(null)
	const [deleting, setDeleting] = useState(false)
	const [deleteError, setDeleteError] = useState('')
	useEffect(() => {
		mounted.current = true
		return () => { mounted.current = false; drag.current = null; clearTimeout(hoverTimer.current) }
	}, [])

	function begin(action, item = null, parentId = null) {
		if (movePending.current) return
		setEditing({ action, item, parentId })
		setValue(action === 'rename' ? item.title : action.startsWith('move') ? item.folder_id ?? item.parent_id ?? '' : '')
		setError('')
	}

	async function submit(event) {
		event.preventDefault()
		if (!editing || movePending.current) return
		if (!editing.action.startsWith('move') && !value.trim()) return setError('Введите название')
		try {
			if (editing.action === 'createFolder') await createFolder(value.trim(), editing.parentId, kind)
			if (editing.action === 'createItem') await onCreateItem(value.trim(), editing.parentId)
			if (editing.action === 'rename') await updateFolder(editing.item.id, { title: value.trim() })
			if (editing.action === 'moveFolder') await updateFolder(editing.item.id, { parent_id: value || null })
			if (editing.action === 'moveItem') await onMoveItem(editing.item.id, value || null)
			setEditing(null)
			setValue('')
		} catch (err) {
			setError(err.message)
		}
	}

	async function remove(folder) {
		if (deleting) return
		setDeleting(true)
		setDeleteError('')
		try {
			await deleteFolder(folder.id, true)
			setPendingDelete(null)
		} catch (err) {
			setDeleteError(err.message)
		} finally { setDeleting(false) }
	}

	function getFolderPath(folder) {
		const names = [folder.title]
		const visited = new Set([folder.id])
		let parentId = folder.parent_id
		while (parentId) {
			const parent = folders.find(item => item.id === parentId)
			if (!parent || visited.has(parent.id)) break
			visited.add(parent.id)
			names.unshift(parent.title)
			parentId = parent.parent_id
		}
		return names.join(' / ')
	}

	function isWithinFolder(folderId, ancestorId) {
		let current = folders.find(item => item.id === folderId)
		const visited = new Set()
		while (current && !visited.has(current.id)) {
			if (current.id === ancestorId) return true
			visited.add(current.id)
			current = folders.find(item => item.id === current.parent_id)
		}
		return false
	}

	function folderOptions(excludeFolderId = null) {
		const descendants = new Set()
		if (excludeFolderId) {
			let changed = true
			descendants.add(excludeFolderId)
			while (changed) {
				changed = false
				for (const folder of folders) {
					if (descendants.has(folder.parent_id) && !descendants.has(folder.id)) {
						descendants.add(folder.id)
						changed = true
					}
				}
			}
		}
		return [
			{ value: '', label: 'Корень' },
			...folders
				.filter(folder => !descendants.has(folder.id))
				.sort((a, b) => getFolderPath(a).localeCompare(getFolderPath(b)))
				.map(folder => ({ value: folder.id, label: getFolderPath(folder) })),
		]
	}

	function startDrag(event, type, item) {
		event.stopPropagation()
		if (!isManager || movePending.current || event.target.closest('input, textarea, select')) { event.preventDefault(); return }
		const payload = { type, id: item.id, kind, workspaceId: useWorkspaceStore.getState().activeId, session: getSessionVersion() }
		drag.current = payload
		setDragging(payload)
		setDropTarget(null)
		setError('')
		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload))
	}

	function endDrag() {
		drag.current = null
		setDragging(null)
		setDropTarget(null)
		clearTimeout(hoverTimer.current)
		hoverFolder.current = null
	}

	function canDropInto(targetFolderId) {
		const payload = drag.current
		if (!isManager || movePending.current || !payload || payload.kind !== kind || payload.session !== getSessionVersion()
			|| payload.workspaceId !== useWorkspaceStore.getState().activeId) return false
		if (targetFolderId !== null && !folders.some(folder => folder.id === targetFolderId)) return false
		const source = (payload.type === 'folder' ? folders : items).find(item => item.id === payload.id)
		const parent = payload.type === 'folder' ? source?.parent_id : source?.folder_id
		return Boolean(source && (parent ?? null) !== targetFolderId && payload.id !== targetFolderId
			&& !(payload.type === 'folder' && targetFolderId && isWithinFolder(targetFolderId, payload.id)))
	}

	function overFolder(event, targetFolderId) {
		event.stopPropagation()
		if (!canDropInto(targetFolderId)) { setDropTarget(null); clearTimeout(hoverTimer.current); hoverFolder.current = null; return }
		event.preventDefault()
		event.dataTransfer.dropEffect = 'move'
		setDropTarget(targetFolderId ?? 'root')
		if (hoverFolder.current !== targetFolderId) {
			clearTimeout(hoverTimer.current)
			hoverFolder.current = targetFolderId
			if (targetFolderId && open[targetFolderId] === false) hoverTimer.current = setTimeout(() => {
				if (canDropInto(targetFolderId)) setOpen(current => ({ ...current, [targetFolderId]: true }))
			}, 600)
		}
		const container = scroll.current
		const rect = container?.getBoundingClientRect()
		if (rect?.height) {
			if (event.clientY < rect.top + 28) container.scrollTop -= 16
			else if (event.clientY > rect.bottom - 28) container.scrollTop += 16
		}
	}

	function leaveFolder(event) {
		event.stopPropagation()
		if (event.currentTarget.contains(event.relatedTarget)) return
		setDropTarget(null)
		clearTimeout(hoverTimer.current)
		hoverFolder.current = null
	}

	async function dropInto(event, targetFolderId) {
		event.preventDefault()
		event.stopPropagation()
		const allowed = canDropInto(targetFolderId)
		const payload = drag.current
		endDrag()
		if (!allowed) return
		movePending.current = true
		setMoving(payload.id)
		try {
			if (payload.type === 'item') await onMoveItem(payload.id, targetFolderId)
			else await updateFolder(payload.id, { parent_id: targetFolderId })
			if (mounted.current && payload.session === getSessionVersion() && payload.workspaceId === useWorkspaceStore.getState().activeId && targetFolderId) setOpen(current => ({ ...current, [targetFolderId]: true }))
		} catch (err) {
			if (mounted.current && payload.session === getSessionVersion() && payload.workspaceId === useWorkspaceStore.getState().activeId) setError(err.message)
		} finally { movePending.current = false; if (mounted.current) setMoving(null) }
	}

	function renderItems(parentId, depth) {
		const grouped = items.filter(item => item.folder_id === parentId).sort((a, b) => a.title.localeCompare(b.title))
		return grouped.map(item => <li
			key={item.id}
			aria-label={`${isDocs ? 'Документ' : 'Доска'}: ${item.title}`}
			draggable={isManager && !moving}
			onDragStart={event => startDrag(event, 'item', item)}
			onDragEnd={endDrag}
			onDragOver={event => overFolder(event, parentId)} onDragLeave={leaveFolder} onDrop={event => dropInto(event, parentId)}
			className={cn('group flex min-w-0 items-center gap-1 rounded-md transition-colors hover:bg-accent animate-in fade-in duration-200 motion-reduce:animate-none', isManager && !moving && 'cursor-grab', (dragging?.id === item.id || moving === item.id) && 'opacity-50')}
			style={{ paddingLeft: Math.min(depth, 4) * 8 }}
		>
			<button type="button" draggable={isManager && !moving} onClick={() => onSelect(item.id)} className={cn('flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground', activeId === item.id && 'bg-primary/20 font-medium text-foreground')}>
				{isDocs ? <FileText className="h-3.5 w-3.5 shrink-0" /> : <LayoutGrid className="h-3.5 w-3.5 shrink-0" />}
				<span className="truncate">{item.title}</span>
			</button>
			{isManager ? <HierarchyActions label={`Действия: ${item.title}`} disabled={Boolean(moving)}>
					<DropdownMenuItem onSelect={() => begin('moveItem', item)}><FolderInput />Переместить в…</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDeleteItem(item)}><Trash2 />Удалить</DropdownMenuItem>
			</HierarchyActions> : null}
		</li>)
	}

	function renderFolder(folder, depth) {
		const expanded = open[folder.id] !== false
		return <li
			key={folder.id}
			aria-label={`Папка: ${folder.title}`}
			draggable={isManager && !moving}
			onDragStart={event => startDrag(event, 'folder', folder)}
			onDragEnd={endDrag}
			onDragOver={event => overFolder(event, folder.id)} onDragLeave={leaveFolder} onDrop={event => dropInto(event, folder.id)}
			className={cn('rounded-md transition-colors animate-in fade-in duration-200 motion-reduce:animate-none', isManager && !moving && 'cursor-grab', (dragging?.id === folder.id || moving === folder.id) && 'opacity-50', dropTarget === folder.id && 'bg-primary/10 ring-1 ring-primary')}
		>
			<div
				className={cn('group flex min-w-0 items-center gap-0.5 rounded-md hover:bg-accent', dropTarget === folder.id && 'bg-primary/15 ring-1 ring-primary')}
				style={{ paddingLeft: Math.min(depth, 4) * 8 }}
			>
				<button type="button" draggable={isManager && !moving} onClick={() => setOpen(current => ({ ...current, [folder.id]: !expanded }))} className="flex min-w-0 flex-1 items-center gap-1 px-1 py-1.5 text-left text-xs font-medium text-foreground">
					{expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
					<Folder className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{folder.title}</span>
				</button>
				{isManager ? <HierarchyActions label={`Действия папки: ${folder.title}`} disabled={Boolean(moving)}>
						<DropdownMenuItem onSelect={() => begin('createItem', null, folder.id)}>{isDocs ? <FileText /> : <LayoutGrid />}Создать {isDocs ? 'документ' : 'доску'}</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => begin('createFolder', null, folder.id)}><Plus />Создать подпапку</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => begin('rename', folder)}><Pencil />Переименовать</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => begin('moveFolder', folder)}><FolderInput />Переместить в…</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => {
							const ids = folderSubtree(folders, folder.id)
							setDeleteError('')
							setPendingDelete({ ...folder, folderCount: ids.size - 1, itemCount: items.filter(item => ids.has(item.folder_id)).length })
						}}><Trash2 />Удалить папку</DropdownMenuItem>
					</HierarchyActions> : null}
			</div>
			{expanded ? <ul>
				{folders.filter(item => item.parent_id === folder.id).sort((a, b) => a.title.localeCompare(b.title)).map(child => renderFolder(child, depth + 1))}
				{renderItems(folder.id, depth + 1)}
			</ul> : null}
		</li>
	}

	return <div className="flex min-h-0 flex-1 flex-col gap-2">
		{editing ? <form className="flex min-w-0 gap-1" onSubmit={submit}>
			{editing.action.startsWith('move') ? <SelectMenu
				ariaLabel="Папка назначения"
				value={value}
				options={folderOptions(editing.action === 'moveFolder' ? editing.item.id : null)}
				onValueChange={setValue}
				className="h-7 min-w-0 flex-1 px-2 text-xs"
			/> : <Input autoFocus className="h-7 text-xs" placeholder={editing.action === 'createItem' ? `Название ${isDocs ? 'документа' : 'доски'}` : 'Название папки'} value={value} onChange={event => setValue(event.target.value)} />}
			<Button type="submit" size="sm" className="h-7 px-2">OK</Button>
			<Button type="button" size="sm" variant="ghost" className="h-7 px-2" aria-label="Отмена" onClick={() => setEditing(null)}>×</Button>
		</form> : null}
		{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
		{moving ? <p role="status" className="text-xs text-muted-foreground">{hierarchyText.moving}</p> : null}
		{dragging ? <div
			className={cn('rounded-md border border-dashed px-2 py-2.5 text-center text-xs text-muted-foreground transition-colors', dropTarget === 'root' && 'border-primary bg-primary/10 text-foreground')}
			onDragOver={event => overFolder(event, null)}
			onDragLeave={leaveFolder}
			onDrop={event => dropInto(event, null)}
		>{hierarchyText.root}</div> : null}
		<ul ref={scroll} aria-label="Иерархия" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1"
			onDragOver={event => overFolder(event, null)} onDragLeave={leaveFolder} onDrop={event => dropInto(event, null)}>
			{folders.filter(folder => folder.parent_id == null).sort((a, b) => a.title.localeCompare(b.title)).map(folder => renderFolder(folder, 0))}
			{renderItems(null, 0)}
			{!folders.length && !items.length ? <li className="px-2 py-2 text-xs text-muted-foreground">Пока пусто</li> : null}
		</ul>
		<ConfirmDialog open={Boolean(pendingDelete)} title="Удалить папку и содержимое?"
			text={pendingDelete ? `«${pendingDelete.title}» будет удалена без возможности восстановления. Подпапок: ${pendingDelete.folderCount}. ${isDocs ? 'Документов' : 'Досок'}: ${pendingDelete.itemCount}. ${isDocs ? 'Все версии документов' : 'Все колонки и задачи досок'} внутри папки также будут удалены.` : ''}
			confirmLabel="Удалить папку и содержимое" busy={deleting} error={deleteError}
			onConfirm={() => pendingDelete && remove(pendingDelete)} onCancel={() => setPendingDelete(null)} />
	</div>
}
