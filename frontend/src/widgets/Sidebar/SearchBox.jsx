import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '@/shared/api/client'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { Input } from '@/components/ui/input'

export default function SearchBox({ workspaceId, boardFolders, documentFolders }) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')
	const [resultSet, setResults] = useState({ scope: '', items: [] })
	const [error, setError] = useState('')
	const view = useBoardsStore(state => state.view)
	const selectBoard = useBoardsStore(state => state.selectBoard)
	const selectDocument = useDocumentsStore(state => state.selectDocument)
	const scope = `${workspaceId}:${view}:${query.trim()}`
	const results = resultSet.scope === scope ? resultSet.items : []

	useEffect(() => {
		let cancelled = false
		if (!query.trim() || !workspaceId) return
		const timer = setTimeout(() => {
			const filter = view === 'all' ? '&all_tasks=true' : view === 'self' ? '' : `&assignee_id=${view}`
			api(`/search?workspace_id=${workspaceId}&q=${encodeURIComponent(query.trim())}${filter}`)
				.then(found => { if (!cancelled) { setResults({ scope, items: found }); setError('') } })
				.catch(err => { if (!cancelled) setError(err.message) })
		}, 250)
		return () => { cancelled = true; clearTimeout(timer) }
	}, [query, workspaceId, view, scope])

	function folderPath(id, kind) {
		const names = []
		const seen = new Set()
		const folders = kind === 'document' ? documentFolders : boardFolders
		while (id && !seen.has(id)) {
			seen.add(id)
			const folder = folders.find(item => item.id === id)
			if (!folder) break
			names.unshift(folder.title)
			id = folder.parent_id
		}
		return names.join(' / ')
	}

	function open(item) {
		if (item.entity_type === 'document') {
			selectDocument(item.id)
			navigate('/documents')
		} else {
			selectBoard(item.board_id)
			navigate(`/dashboard?task=${item.id}`)
		}
		setQuery('')
		setResults({ scope: '', items: [] })
	}

	return <div className="relative mb-3 space-y-1">
		<div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={event => { setQuery(event.target.value); setError('') }} placeholder="Поиск задач и документов" className="h-8 pl-8 text-xs" /></div>
		{error ? <p className="text-xs text-destructive">{error}</p> : null}
		{query.trim() ? <ul className="max-h-56 overflow-y-auto rounded-md border border-border bg-card p-1">{results.length ? results.map(item => <li key={`${item.entity_type}-${item.id}`}><button type="button" onClick={() => open(item)} className="w-full rounded px-2 py-1.5 text-left hover:bg-accent"><span className="block truncate text-xs font-medium">{item.title}</span><span className="block truncate text-[0.65rem] text-muted-foreground">{item.entity_type === 'task' ? 'Задача' : 'Документ'} · {folderPath(item.folder_id, item.entity_type) || 'Корень'}</span></button></li>) : <li className="px-2 py-1.5 text-xs text-muted-foreground">Ничего не найдено</li>}</ul> : null}
	</div>
}
