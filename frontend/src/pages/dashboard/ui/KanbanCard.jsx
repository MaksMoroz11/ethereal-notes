import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STATUSES = ['Открыта', 'В работе', 'На проверке', 'Готово']

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
			<select
				className="mt-1 rounded-md border border-border bg-accent px-2 py-1.5 text-[0.7rem] text-secondary-foreground outline-none transition hover:border-primary focus:border-primary"
				value={task.status}
				onClick={e => e.stopPropagation()}
				onChange={e => onMove(e.target.value)}
			>
				{STATUSES.map(status => (
					<option key={status} value={status}>
						{status}
					</option>
				))}
			</select>
		</div>
	)
}
