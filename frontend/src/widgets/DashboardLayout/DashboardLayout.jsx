import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Sidebar from '../Sidebar/Sidebar'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout() {
	return (
		<div className="app">
			<Header fluid />
			<div className={styles.body}>
				<Sidebar />
				<main className={styles.main}>
					<Outlet />
				</main>
			</div>
		</div>
	)
}
