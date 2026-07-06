import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../shared/store/authStore'

export default function RequireAuth({ children }) {
	const token = useAuthStore(state => state.token)
	if (!token) return <Navigate to="/login" replace />
	return children
}
