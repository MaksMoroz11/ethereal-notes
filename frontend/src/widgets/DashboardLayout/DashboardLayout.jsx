import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'

export default function DashboardLayout() {
	const loadWorkspaces = useWorkspaceStore(state => state.loadWorkspaces)
	const activeWorkspaceId = useWorkspaceStore(state => state.activeId)
	const loadBoards = useBoardsStore(state => state.loadBoards)
	const loadDocuments = useDocumentsStore(state => state.loadDocuments)

	useEffect(() => {
		loadWorkspaces()
	}, [loadWorkspaces])

	useEffect(() => {
		if (!activeWorkspaceId) return
		loadBoards(activeWorkspaceId)
		loadDocuments(activeWorkspaceId)
	}, [activeWorkspaceId, loadBoards, loadDocuments])

	return (
		<div className="app">
			<Header fluid />
			<div className="flex min-h-0 flex-1">
				<Sidebar />
				<main className="min-w-0 flex-1 overflow-y-auto">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
