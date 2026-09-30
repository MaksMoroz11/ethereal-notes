import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../shared/store/authStore'

export default function RequireAuth({ children }) {
	const token = useAuthStore(state => state.token)
	const validated = useAuthStore(state => state.validated)
	const error = useAuthStore(state => state.error)
	const validateSession = useAuthStore(state => state.validateSession)
	useEffect(() => { if (token && !validated) validateSession() }, [token, validated, validateSession])
	if (!token) return <Navigate to="/login" replace />
	if (!validated) return <div className="px-8 py-12 text-center text-sm">
		{error ? <><p>{error}</p><button type="button" onClick={validateSession}>Повторить</button></> : 'Проверка сессии…'}
	</div>
	return children
}
