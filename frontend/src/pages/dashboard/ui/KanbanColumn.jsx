import { memo } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import KanbanCard from './KanbanCard'

function KanbanColumn({ column, index, columns, tasks, draft, editingColumn, isManager, user,
    run, updateColumn, setEditingColumn, checkingColumn, beginColumnDelete, setOpenId,
    setPendingDelete, moveTask, saveDraft, cancelDraft, setDraft, savingDraft }) {
    return <div key={column.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted p-3.5">
						<div className="flex min-w-0 items-center gap-1 text-sm font-semibold text-secondary-foreground">
							{editingColumn?.id === column.id ? <form className="flex min-w-0 flex-1 gap-1" onSubmit={event => { event.preventDefault(); run(updateColumn(column.id, { title: editingColumn.title })); setEditingColumn(null) }}>
								<Input autoFocus className="h-7 text-xs" value={editingColumn.title} onChange={event => setEditingColumn({ ...editingColumn, title: event.target.value })} />
								<Button size="sm" type="submit">OK</Button>
							</form> : <span className="min-w-0 flex-1 truncate">{column.title}</span>}
							<span className="rounded-full bg-secondary px-2 py-0.5 text-[0.7rem]">{tasks.length}</span>
						</div>
						{isManager ? <div className="flex flex-wrap items-center gap-1">
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Переименовать колонку" onClick={() => setEditingColumn({ id: column.id, title: column.title })}><Pencil className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Передвинуть влево" disabled={!index} onClick={() => run(updateColumn(column.id, { position: index - 1 }))}><ChevronLeft className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Передвинуть вправо" disabled={index === columns.length - 1} onClick={() => run(updateColumn(column.id, { position: index + 1 }))}><ChevronRight className="h-3 w-3" /></Button>
							<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Удалить колонку" disabled={checkingColumn} onClick={() => beginColumnDelete(column)}><Trash2 className="h-3 w-3" /></Button>
						</div> : null}
						<div className="flex min-w-0 flex-col gap-2.5">
							{tasks.map(task => <KanbanCard key={task.id} task={task} columns={columns} canMove={isManager || task.assignee_id === user?.id} canDelete={isManager} onOpen={() => setOpenId(task.id)} onDelete={() => setPendingDelete(task)} onMove={next => run(moveTask(task.id, next))} />)}
							{draft ? <form
								className="rounded-lg border border-primary/40 bg-card p-3 shadow-sm"
								onSubmit={event => saveDraft(event, column.id)}
								onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !draft.title.trim()) cancelDraft(column.id) }}
								onKeyDown={event => { if (event.key === 'Escape') cancelDraft(column.id) }}
							>
								<Input autoFocus aria-label="Название новой задачи" placeholder="Название задачи" value={draft.title} onChange={event => setDraft(column.id, { title: event.target.value })} className="mb-2 h-auto border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0" />
								<p className="mb-3 text-[0.7rem] text-muted-foreground">Новая задача · {column.title}</p>
								{draft.error ? <p className="mb-2 text-xs text-destructive">{draft.error}</p> : null}
								<div className="flex justify-end gap-1">
									<Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Отменить создание" onClick={() => cancelDraft(column.id)}><X className="h-4 w-4" /></Button>
									<Button type="submit" size="icon" className="h-7 w-7" aria-label="Сохранить задачу" disabled={!draft.title.trim() || savingDraft !== null}><Check className="h-4 w-4" /></Button>
								</div>
							</form> : null}
						</div>
						{isManager && !draft ? <Button type="button" variant="ghost" className="w-full justify-start text-xs text-muted-foreground" onClick={() => setDraft(column.id, { title: '', error: '' })}><Plus className="h-3.5 w-3.5" />Добавить задачу</Button> : null}
					</div>
}
export default memo(KanbanColumn, (a, b) =>
    a.column === b.column && a.columns === b.columns && a.index === b.index &&
    a.draft === b.draft && a.editingColumn === b.editingColumn && a.isManager === b.isManager &&
    a.user === b.user && a.checkingColumn === b.checkingColumn && a.savingDraft === b.savingDraft &&
    a.tasks.length === b.tasks.length && a.tasks.every((task, index) => task === b.tasks[index]))
