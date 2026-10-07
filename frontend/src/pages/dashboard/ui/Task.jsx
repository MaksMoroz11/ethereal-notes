import { taskText } from '@/shared/messages/tasks'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatLocalDateOnly } from '@/shared/lib/date'

function getInitials(name) {
	return name
		.split(' ')
		.map(part => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

function formatDate(iso) {
	return formatLocalDateOnly(iso, {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export default function Task({ task, columnTitle, columns = [], canMove = false, onMove, canEdit = false, onClose, onChange }) {
	const members = useWorkspaceStore(state => state.members)
	const authorLogin = members.find(member => member.user_id === task.author_id)?.login ?? taskText.unknownAuthor
	const isBug = task.tags.includes('BUG')
	const [desc, setDesc] = useState(task.title)
	const [additionalDesc, setAdditionalDesc] = useState(task.description)
	const [editingDesc, setEditingDesc] = useState(false)
	const [editingAdditional, setEditingAdditional] = useState(false)
	const [assigneeId, setAssigneeId] = useState(task.assignee_id ? String(task.assignee_id) : '')
	const [saveError, setSaveError] = useState('')
	const [moving, setMoving] = useState(false)
    const editRevision = useRef(task.revision)
    const previousTask = useRef(task)
    useEffect(() => {
        const previous = previousTask.current
        setDesc(current => current === previous.title ? task.title : current)
        setAdditionalDesc(current => current === previous.description ? task.description : current)
        setAssigneeId(current => current === String(previous.assignee_id ?? '') ? String(task.assignee_id ?? '') : current)
        previousTask.current = task
    }, [task])
	async function move(columnId) {
		setMoving(true)
		try { await onMove(columnId); setSaveError('') } catch (error) { setSaveError(error.message) } finally { setMoving(false) }
	}

	async function save(changes) {
		setSaveError('')
		try {
			if (onChange) await onChange(changes)
		} catch (error) {
			setSaveError(error.message)
		}
	}

	function saveDesc() {
		setEditingDesc(false)
		if (desc.trim() && desc !== task.title) save({ title: desc.trim(), expected_revision: editRevision.current })
	}

	function saveAdditional() {
		setEditingAdditional(false)
		if (onChange && additionalDesc !== task.description) save({ description: additionalDesc, expected_revision: editRevision.current })
	}

	function changeAssignee(value) {
		setAssigneeId(value)
		if (value !== String(task.assignee_id ?? '')) {
			save({ assignee_id: value ? Number(value) : null })
		}
	}

	const selectedAssignee = members.find(member => String(member.user_id) === assigneeId)

	return (
		<div className="w-full rounded-xl border border-border border-l-[3px] border-l-primary bg-card p-7">
			<div className="mb-5 flex items-center gap-4">
				<span className="text-xs font-semibold tracking-wider text-primary">#{task.uid}</span>
				<div className="flex items-center gap-2">
					{isBug && (
						<span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/35 bg-destructive/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-destructive">
							<span className="h-1.5 w-1.5 rounded-full bg-destructive" />
							bug
						</span>
					)}
					{columnTitle && (
						<span
							className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide"
						>
							{columnTitle}
						</span>
					)}
				</div>
				{onClose && (
					<Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={onClose} aria-label={taskText.close}>
						<X />
					</Button>
				)}
			</div>

			<div className="mb-5 h-px bg-border" />
            {canMove ? <label className="mb-5 flex items-center gap-3 text-sm">{taskText.status}
                <select aria-label={taskText.columnLabel} className="rounded-md border border-border bg-card p-2" value={task.column_id} disabled={moving} onChange={event => move(event.target.value)}>
                    {columns.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
                </select>
            </label> : null}

			{editingDesc && canEdit ? (
				<Input
					className="mb-3.5 font-semibold"
					value={desc}
					autoFocus
					onChange={e => setDesc(e.target.value)}
					onBlur={saveDesc}
					onKeyDown={e => e.key === 'Enter' && e.target.blur()}
				/>
			) : (
				<h3
					className="mb-3.5 cursor-text rounded-md px-1.5 text-[1.05rem] font-semibold leading-relaxed text-foreground transition hover:bg-accent"
					onClick={() => { if (canEdit) { editRevision.current = task.revision; setEditingDesc(true) } }}
				>
					{desc}
				</h3>
			)}

			{editingAdditional && canEdit ? (
				<Textarea
					className="mb-6 min-h-20"
					value={additionalDesc}
					autoFocus
					onChange={e => setAdditionalDesc(e.target.value)}
					onBlur={saveAdditional}
				/>
			) : (
				<p
					className="mb-6 cursor-text whitespace-pre-wrap rounded-md px-1.5 text-sm leading-relaxed text-muted-foreground transition hover:bg-accent"
					onClick={() => { if (canEdit) { editRevision.current = task.revision; setEditingAdditional(true) } }}
				>
					{additionalDesc || <span className="italic text-muted-foreground/70">{taskText.addDescription}</span>}
				</p>
			)}

			{task.tags.length > 0 && (
				<div className="mb-6 flex flex-wrap gap-2">
					{task.tags.map(tag => (
						<span
							key={tag}
							className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[0.7rem] tracking-wide text-primary"
						>
							{tag}
						</span>
					))}
				</div>
			)}

			<div className="mb-6 flex flex-col gap-2">
				<span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">
					{taskText.assignee}
				</span>
				{!canEdit ? <span className="text-sm">{selectedAssignee?.login ?? taskText.unassigned}</span> : <DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="outline" className="h-9 w-full justify-between px-3 text-sm font-normal">
							<span className="truncate">{selectedAssignee?.login ?? taskText.unassigned}</span>
							<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
						<DropdownMenuItem onSelect={() => changeAssignee('')}>
							<span>{taskText.unassigned}</span>
							{!assigneeId ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
						</DropdownMenuItem>
						{members.map(member => (
							<DropdownMenuItem key={member.user_id} onSelect={() => changeAssignee(String(member.user_id))}>
								<span className="truncate">{member.login}{member.role === 'owner' ? ' (владелец)' : ''}</span>
								{assigneeId === String(member.user_id) ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>}
			</div>

			{saveError && <p className="mb-5 text-sm text-destructive">{saveError}</p>}

			<div className="flex items-end justify-between gap-4 border-t border-border pt-5">
				<div className="flex flex-col gap-1.5">
					<span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">{taskText.author}</span>
					<div className="flex items-center gap-2.5">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">
							{getInitials(authorLogin)}
						</div>
						<span className="text-sm font-medium text-secondary-foreground">{authorLogin}</span>
					</div>
				</div>
				<div className="flex flex-col items-end gap-0.5 text-[0.7rem] text-muted-foreground/80">
					<span>
						<span className="mr-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">{taskText.created}</span>
						{formatDate(task.created_at)}
					</span>
					<span>
						<span className="mr-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">{taskText.updated}</span>
						{formatDate(task.updated_at)}
					</span>
				</div>
			</div>
		</div>
	)
}
