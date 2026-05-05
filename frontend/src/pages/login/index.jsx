import React from 'react'
import { Link } from 'react-router-dom'

export default function Login() {
	return (
		<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
			<h1 style={{ color: '#ffffff' }}>Страница в разработке</h1>
			<p style={{ color: '#9ca3af' }}>Здесь будет страница входа.</p>
			<Link to="/" style={{ color: '#6366f1' }}>← На главную</Link>
		</div>
	)
}
