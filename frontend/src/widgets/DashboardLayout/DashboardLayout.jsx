import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'

export default function DashboardLayout() {
	const loadBoards = useBoardsStore(state => state.loadBoards)
	const loadDocuments = useDocumentsStore(state => state.loadDocuments)

	useEffect(() => {
		loadBoards()
		loadDocuments()
	}, [loadBoards, loadDocuments])

	return (
		<div className="app">
			<Header fluid />
			<div className="flex min-h-0 flex-1">
				<Sidebar />
				<main className="flex-1 overflow-y-auto">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
