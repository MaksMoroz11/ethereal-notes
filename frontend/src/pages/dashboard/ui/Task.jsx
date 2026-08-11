import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function getInitials(name) {
	return name
		.split(' ')
		.map(part => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

function formatDate(iso) {
	return new Date(iso).toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

const STATUS_STYLES = {
	'Открыта': 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
	'В работе': 'border-sky-400/30 bg-sky-400/10 text-sky-400',
	'На проверке': 'border-amber-400/30 bg-amber-400/10 text-amber-400',
	'Готово': 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
}

export default function Task({ task, onClose, onChange }) {
	const authorLogin = useAuthStore(state => state.user?.login ?? '')
	const isBug = task.tags.includes('BUG')
	const [desc, setDesc] = useState(task.title)
	const [additionalDesc, setAdditionalDesc] = useState(task.description)
	const [editingDesc, setEditingDesc] = useState(false)
	const [editingAdditional, setEditingAdditional] = useState(false)

	function saveDesc() {
		setEditingDesc(false)
		if (onChange && desc !== task.title) onChange({ title: desc })
	}

	function saveAdditional() {
		setEditingAdditional(false)
		if (onChange && additionalDesc !== task.description) onChange({ description: additionalDesc })
	}

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
					{task.status && (
						<span
							className={cn(
								'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide',
								STATUS_STYLES[task.status] ?? STATUS_STYLES['Открыта']
							)}
						>
							{task.status}
						</span>
					)}
				</div>
				{onClose && (
					<Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={onClose} aria-label="Закрыть">
						<X />
					</Button>
				)}
			</div>

			<div className="mb-5 h-px bg-border" />

			{editingDesc ? (
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
					onClick={() => setEditingDesc(true)}
				>
					{desc}
				</h3>
			)}

			{editingAdditional ? (
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
					onClick={() => setEditingAdditional(true)}
				>
					{additionalDesc || <span className="italic text-muted-foreground/70">Добавить описание…</span>}
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

			<div className="flex items-end justify-between gap-4 border-t border-border pt-5">
				<div className="flex flex-col gap-1.5">
					<span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">автор</span>
					<div className="flex items-center gap-2.5">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">
							{getInitials(authorLogin)}
						</div>
						<span className="text-sm font-medium text-secondary-foreground">{authorLogin}</span>
					</div>
				</div>
				<div className="flex flex-col items-end gap-0.5 text-[0.7rem] text-muted-foreground/80">
					<span>
						<span className="mr-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">создано</span>
						{formatDate(task.created_at)}
					</span>
					<span>
						<span className="mr-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">обновлено</span>
						{formatDate(task.updated_at)}
					</span>
				</div>
			</div>
		</div>
	)
}
