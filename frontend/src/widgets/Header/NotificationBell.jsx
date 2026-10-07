import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotificationsStore } from '@/shared/store/notificationsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { notificationLabels, notificationText } from '@/shared/messages/notifications'
import { formatLocalDate } from '@/shared/lib/date'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'

export default function NotificationBell() {
	const navigate = useNavigate()
	const items = useNotificationsStore(state => state.items)
	const count = useNotificationsStore(state => state.unreadCount)
	const error = useNotificationsStore(state => state.error)
	const cursor = useNotificationsStore(state => state.nextCursor)
	const load = useNotificationsStore(state => state.load)
	const read = useNotificationsStore(state => state.read)
	const readAll = useNotificationsStore(state => state.readAll)
	const [open, setOpen] = useState(false)
	const [opening, setOpening] = useState(false)
	useEffect(() => {
		let timer, cancelled = false, running = false, delay = 10000
		async function poll() {
			clearTimeout(timer)
			if (document.hidden || cancelled || running) return
			running = true
			await load()
			running = false
			delay = useNotificationsStore.getState().error ? Math.min(delay * 2, 60000) : 10000
			if (!cancelled && !document.hidden) timer = setTimeout(poll, delay)
		}
		const visible = () => { if (document.hidden) clearTimeout(timer); else poll() }
		poll()
		document.addEventListener('visibilitychange', visible)
		return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visible) }
	}, [load])
	async function openItem(item) {
		if (!item.accessible || opening) return
		setOpening(true)
		try {
			await useWorkspaceStore.getState().loadWorkspaces()
			if (!useWorkspaceStore.getState().workspaces.some(space => space.id === item.workspace_id)) return
			if (useWorkspaceStore.getState().activeId !== item.workspace_id) {
				await useWorkspaceStore.getState().selectWorkspace(item.workspace_id)
				await useBoardsStore.getState().loadBoards(item.workspace_id)
			}
			await read(item.id)
			if (item.kind.startsWith('task.')) {
				await useBoardsStore.getState().loadBoard(item.board_id)
				const store = useBoardsStore.getState()
				if (store.view !== 'all' && useWorkspaceStore.getState().workspaces.find(space => space.id === item.workspace_id)?.role !== 'member') await store.setView('all')
				store.selectBoard(item.board_id)
				navigate(`/dashboard?task=${item.entity_id}`)
			} else navigate('/dashboard')
			setOpen(false)
		} catch { /* API errors are displayed by the client. */ }
		finally { setOpening(false) }
	}
	return <DropdownMenu open={open} onOpenChange={next => { setOpen(next); if (next) load() }}>
		<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`${notificationText.title}: ${count} непрочитанных`}>
			<Bell />{count > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{count > 99 ? '99+' : count}</span> : null}
		</Button></DropdownMenuTrigger>
		<DropdownMenuContent align="end" className="z-[120] w-80 max-w-[calc(100vw-32px)] p-3">
			<div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{notificationText.title}</h2><Button size="sm" variant="ghost" disabled={!count} onClick={() => readAll().catch(() => {})}>{notificationText.readAll}</Button></div>
			{error ? <p role="alert" className="mb-2 text-xs text-destructive">{error}</p> : null}
			<div className="max-h-96 space-y-2 overflow-y-auto">
				{items.length ? items.map(item => <div key={item.id} className={`rounded-lg border p-3 text-sm ${item.read_at ? 'border-border' : 'border-primary/40 bg-accent'}`}>
					<button className="w-full text-left disabled:cursor-default" disabled={!item.accessible || opening} onClick={() => openItem(item)}><span className="block text-xs text-muted-foreground">{notificationLabels[item.kind] || item.kind}</span><span className="mt-1 block">{item.title}</span></button>
					<div className="mt-2 flex items-center justify-between"><time className="text-[10px] text-muted-foreground">{formatLocalDate(item.created_at)}</time>{!item.read_at ? <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Прочитать уведомление" onClick={() => read(item.id).catch(() => {})}><Check className="h-3 w-3" /></Button> : null}</div>
				</div>) : <p className="py-5 text-center text-sm text-muted-foreground">{notificationText.empty}</p>}
			</div>
			{cursor ? <Button className="mt-2 w-full" variant="ghost" size="sm" onClick={() => load(true)}>{notificationText.more}</Button> : null}
		</DropdownMenuContent>
	</DropdownMenu>
}
