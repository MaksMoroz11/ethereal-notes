import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function stopCardClick(e) {
	e.stopPropagation()
}

export default function KanbanCard({ task, columns, readOnly, onOpen, onDelete, onMove }) {
	const members = useWorkspaceStore(state => state.members)
	const assignee = members.find(member => member.user_id === task.assignee_id)
	const column = columns.find(item => item.id === task.column_id)
	return (
		<div
			className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border border-l-[3px] border-l-primary bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
			onClick={onOpen}
		>
			<div className="flex items-center justify-between">
				<span className="text-[0.7rem] font-semibold tracking-wider text-primary">#{task.uid}</span>
				{!readOnly ? <Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
					aria-label="Удалить задачу"
					onClick={e => {
						e.stopPropagation()
						onDelete()
					}}
				>
					<X className="h-3.5 w-3.5" />
				</Button> : null}
			</div>
			<p className="text-sm leading-snug text-foreground">{task.title}</p>
			{task.assignee_id ? (
				<p className="truncate text-xs text-muted-foreground">Исполнитель: {assignee?.login ?? 'неизвестен'}</p>
			) : null}
			{readOnly ? <span className="text-xs text-muted-foreground">{column?.title}</span> : <DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-1 h-7 w-full justify-between px-2 text-[0.7rem] font-medium"
						onPointerDown={stopCardClick}
						onClick={stopCardClick}
					>
						<span className="truncate">{column?.title}</span>
						<ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-40" onClick={stopCardClick}>
					{columns.map(item => (
						<DropdownMenuItem
							key={item.id}
							className="text-xs"
							onClick={() => onMove(item.id)}
						>
							<span>{item.title}</span>
							{item.id === task.column_id ? <Check className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>}
		</div>
	)
}
