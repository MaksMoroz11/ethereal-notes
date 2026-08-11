import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import { useBoardsStore } from '@/shared/store/boardsStore'

export default function DashboardLayout() {
	const loadBoards = useBoardsStore(state => state.loadBoards)

	useEffect(() => {
		loadBoards()
	}, [loadBoards])

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
