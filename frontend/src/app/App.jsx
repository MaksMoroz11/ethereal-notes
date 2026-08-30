import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '../widgets/Layout/Layout'
import DashboardLayout from '../widgets/DashboardLayout/DashboardLayout'
import RequireAuth from './RequireAuth'
import Home from '../pages/home/index'
import Login from '../pages/login/index'
import Dashboard from '../pages/dashboard/index'
import Documents from '../pages/documents/index'
import Activity from '../pages/activity/index'
import NotFound from '../pages/not-found/index'

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
				</Route>
				<Route
					element={
						<RequireAuth>
							<DashboardLayout />
						</RequireAuth>
					}
				>
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/documents" element={<Documents />} />
					<Route path="/activity" element={<Activity />} />
				</Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	)
}
