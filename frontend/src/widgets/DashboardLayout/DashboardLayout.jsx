import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'

export default function DashboardLayout() {
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
	const loadWorkspaces = useWorkspaceStore(state => state.loadWorkspaces)
	const activeWorkspaceId = useWorkspaceStore(state => state.activeId)
	const loadBoards = useBoardsStore(state => state.loadBoards)
	const loadDocuments = useDocumentsStore(state => state.loadDocuments)
	const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), [])

	useEffect(() => {
		loadWorkspaces()
	}, [loadWorkspaces])

	useEffect(() => {
		if (!activeWorkspaceId) return
		loadBoards(activeWorkspaceId)
		loadDocuments(activeWorkspaceId)
	}, [activeWorkspaceId, loadBoards, loadDocuments])

	return (
		<div className="app h-screen overflow-hidden">
			<Header fluid onMenuClick={() => setMobileSidebarOpen(true)} />
			<div className="flex min-h-0 flex-1">
				{mobileSidebarOpen ? (
					<button
						type="button"
						aria-label="Закрыть меню"
						className="fixed inset-0 top-[69px] z-40 bg-black/50 md:hidden"
						onClick={closeMobileSidebar}
					/>
				) : null}
				<Sidebar mobileOpen={mobileSidebarOpen} onClose={closeMobileSidebar} />
				<main className="min-w-0 flex-1 overflow-y-auto">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
