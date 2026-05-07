import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '../widgets/Layout/Layout'
import Home from '../pages/home/index'
import Login from '../pages/login/index'
import NotFound from '../pages/not-found/index'

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
				</Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	)
}
