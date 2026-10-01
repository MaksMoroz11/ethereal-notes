import { useRef, useState } from 'react'
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

const DRAG_TYPE = 'application/x-ethereal-folder-item'

function HierarchyActions({ label, children }) {
	const trigger = useRef(null)
	const [placement, setPlacement] = useState({})
	return <DropdownMenu onOpenChange={open => {
		if (open) {
			const rect = trigger.current.getBoundingClientRect()
			setPlacement({ height: Math.max(1, window.innerHeight - rect.bottom - 14), offset: Math.min(20, window.innerWidth - rect.left - 208 - 8) })
		}
	}}>
		<DropdownMenuTrigger asChild>
			<button ref={trigger} type="button" aria-label={label} className="mr-1 rounded p-1 text-muted-foreground opacity-100 transition hover:bg-accent-foreground/10 hover:text-foreground focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
				<Ellipsis className="h-3.5 w-3.5" />
			</button>
		</DropdownMenuTrigger>
		<DropdownMenuContent side="bottom" align="start" alignOffset={placement.offset ?? 20} sideOffset={6} avoidCollisions={false} style={{ maxHeight: placement.height }} className="w-52 min-w-0 max-w-[calc(100vw-16px)] overflow-y-auto">
			{children}
		</DropdownMenuContent>
	</DropdownMenu>
}

export default function FolderTree({ folders, items, isDocs, isManager, activeId, onSelect, onCreateItem, onMoveItem, onDeleteItem }) {
	const { createFolder, updateFolder, deleteFolder } = useFoldersStore()
	const kind = isDocs ? 'document' : 'board'
	const [open, setOpen] = useState({})
	const [editing, setEditing] = useState(null)
	const [value, setValue] = useState('')
	const [error, setError] = useState('')
	const [dragging, setDragging] = useState(null)
	const [dropTarget, setDropTarget] = useState(null)
	const [pendingDelete, setPendingDelete] = useState(null)
	const [deleting, setDeleting] = useState(false)
	const [deleteError, setDeleteError] = useState('')

	function begin(action, item = null, parentId = null) {
		setEditing({ action, item, parentId })
		setValue(action === 'rename' ? item.title : action.startsWith('move') ? item.folder_id ?? item.parent_id ?? '' : '')
		setError('')
	}

	async function submit(event) {
		event.preventDefault()
		if (!editing) return
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
		let parentId = folder.parent_id
		while (parentId) {
			const parent = folders.find(item => item.id === parentId)
			if (!parent) break
			names.unshift(parent.title)
			parentId = parent.parent_id
		}
		return names.join(' / ')
	}

	function isWithinFolder(folderId, ancestorId) {
		let current = folders.find(item => item.id === folderId)
		while (current) {
			if (current.id === ancestorId) return true
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
		const payload = { type, id: item.id, folderId: type === 'item' ? item.folder_id : item.parent_id }
		setDragging(payload)
		setDropTarget(null)
		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload))
	}

	function readDrag(event) {
		try {
			return JSON.parse(event.dataTransfer.getData(DRAG_TYPE))
		} catch {
			return dragging
		}
	}

	async function dropInto(event, targetFolderId) {
		event.preventDefault()
		event.stopPropagation()
		const payload = readDrag(event)
		setDropTarget(null)
		setDragging(null)
		if (!payload || payload.folderId === targetFolderId || payload.id === targetFolderId
			|| (payload.type === 'folder' && targetFolderId && isWithinFolder(targetFolderId, payload.id))) return
		try {
			if (payload.type === 'item') await onMoveItem(payload.id, targetFolderId)
			else {
				await updateFolder(payload.id, { parent_id: targetFolderId })
				if (targetFolderId) setOpen(current => ({ ...current, [targetFolderId]: true }))
			}
		} catch (err) {
			setError(err.message)
		}
	}

	function renderItems(parentId, depth) {
		const grouped = items.filter(item => item.folder_id === parentId).sort((a, b) => a.title.localeCompare(b.title))
		return grouped.map(item => <li
			key={item.id}
			draggable={isManager}
			onDragStart={event => startDrag(event, 'item', item)}
			onDragEnd={() => { setDragging(null); setDropTarget(null) }}
			className={cn('group flex min-w-0 items-center gap-1 rounded-md hover:bg-accent', dragging?.id === item.id && 'opacity-50')}
			style={{ paddingLeft: Math.min(depth, 4) * 8 }}
		>
			<button type="button" onClick={() => onSelect(item.id)} className={cn('flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground', activeId === item.id && 'bg-primary/20 font-medium text-foreground')}>
				{isDocs ? <FileText className="h-3.5 w-3.5 shrink-0" /> : <LayoutGrid className="h-3.5 w-3.5 shrink-0" />}
				<span className="truncate">{item.title}</span>
			</button>
			{isManager ? <HierarchyActions label={`Действия: ${item.title}`}>
					<DropdownMenuItem onSelect={() => begin('moveItem', item)}><FolderInput />Переместить в…</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDeleteItem(item)}><Trash2 />Удалить</DropdownMenuItem>
			</HierarchyActions> : null}
		</li>)
	}

	function renderFolder(folder, depth) {
		const expanded = open[folder.id] !== false
		const canDrop = isManager && dragging?.id !== folder.id
			&& (dragging?.type !== 'folder' || !isWithinFolder(folder.id, dragging.id))
		return <li
			key={folder.id}
			draggable={isManager}
			onDragStart={event => startDrag(event, 'folder', folder)}
			onDragEnd={() => { setDragging(null); setDropTarget(null) }}
			className={cn(dragging?.id === folder.id && 'opacity-50')}
		>
			<div
				className={cn('group flex min-w-0 items-center gap-0.5 rounded-md hover:bg-accent', dropTarget === folder.id && 'bg-primary/15 ring-1 ring-primary')}
				style={{ paddingLeft: Math.min(depth, 4) * 8 }}
				onDragOver={event => { if (canDrop) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(folder.id) } }}
				onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null) }}
				onDrop={event => dropInto(event, folder.id)}
			>
				<button type="button" onClick={() => setOpen(current => ({ ...current, [folder.id]: !expanded }))} className="flex min-w-0 flex-1 items-center gap-1 px-1 py-1.5 text-left text-xs font-medium text-foreground">
					{expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
					<Folder className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{folder.title}</span>
				</button>
				{isManager ? <HierarchyActions label={`Действия папки: ${folder.title}`}>
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
		{error ? <p className="text-xs text-destructive">{error}</p> : null}
		{dragging ? <div
			className={cn('rounded-md border border-dashed px-2 py-1.5 text-center text-xs text-muted-foreground', dropTarget === 'root' && 'border-primary bg-primary/10 text-foreground')}
			onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget('root') }}
			onDragLeave={() => setDropTarget(null)}
			onDrop={event => dropInto(event, null)}
		>Переместить в корень</div> : null}
		<ul className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
