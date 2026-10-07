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
import Documentation from '../pages/documentation/index'
import Privacy from '../pages/privacy/index'
import CookieBanner from '@/shared/ui/CookieBanner'
import Toasts from '@/shared/ui/Toasts'

export default function App() {
	return (
		<BrowserRouter>
			<CookieBanner />
			<Toasts />
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
					<Route path="/documentation" element={<Documentation />} />
					<Route path="/privacy" element={<Privacy />} />
					<Route path="/consent" element={<Privacy consent />} />
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
