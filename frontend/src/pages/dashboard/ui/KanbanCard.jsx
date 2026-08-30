import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

function stopCardClick(e) {
	e.stopPropagation()
}

export default function KanbanCard({ task, onOpen, onDelete, onMove }) {
	return (
		<div
			className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border border-l-[3px] border-l-primary bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
			onClick={onOpen}
		>
			<div className="flex items-center justify-between">
				<span className="text-[0.7rem] font-semibold tracking-wider text-primary">#{task.uid}</span>
				<Button
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
				</Button>
			</div>
			<p className="text-sm leading-snug text-foreground">{task.title}</p>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-1 h-7 w-full justify-between px-2 text-[0.7rem] font-medium"
						onPointerDown={stopCardClick}
						onClick={stopCardClick}
					>
						<span className="truncate">{task.status}</span>
						<ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-40" onClick={stopCardClick}>
					{STATUSES.map(status => (
						<DropdownMenuItem
							key={status}
							className="text-xs"
							onClick={() => onMove(status)}
						>
							<span>{status}</span>
							{status === task.status ? <Check className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
