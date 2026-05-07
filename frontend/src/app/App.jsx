import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '../widgets/Layout/Layout'
import DashboardLayout from '../widgets/DashboardLayout/DashboardLayout'
import Home from '../pages/home/index'
import Dashboard from '../pages/dashboard/index'
import NotFound from '../pages/not-found/index'

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
				</Route>
				<Route element={<DashboardLayout />}>
					<Route path="/dashboard" element={<Dashboard />} />
				</Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	)
}
