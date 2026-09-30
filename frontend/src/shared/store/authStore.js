import { create } from 'zustand'
import { api, setToken, onUnauthorized, getSessionVersion } from '../api/client'
import { encryptPassword } from '../lib/encryptPassword'

function readSession() {
	try {
		const token = sessionStorage.getItem('token')
		const user = JSON.parse(sessionStorage.getItem('user'))
		if (token && typeof user?.id === 'number' && typeof user?.login === 'string') return { token, user }
	} catch { /* Invalid stored sessions are discarded. */ }
	sessionStorage.removeItem('token')
	sessionStorage.removeItem('user')
	return { token: null, user: null }
}

const saved = readSession()
if (saved.token) setToken(saved.token)
let validation = null

export const useAuthStore = create((set, get) => {
	function clearSession() {
		setToken(null)
		sessionStorage.removeItem('token')
		sessionStorage.removeItem('user')
		validation = null
		set({ token: null, user: null, validated: true, validating: false, error: '' })
	}
	async function authenticate(path, login, password) {
		const version = getSessionVersion()
		const encrypted = await encryptPassword(password)
		const data = await api(path, { method: 'POST', body: { login, ...encrypted } })
		if (version !== getSessionVersion()) return
		setToken(data.token)
		sessionStorage.setItem('token', data.token)
		sessionStorage.setItem('user', JSON.stringify(data.user))
		set({ token: data.token, user: data.user, validated: true, validating: false, error: '' })
	}
	return {
		...saved,
		validated: !saved.token,
		validating: false,
		error: '',
		register: (login, password) => authenticate('/auth/register', login, password),
		login: (login, password) => authenticate('/auth/login', login, password),
		clearSession,
		validateSession: () => {
			if (validation) return validation
			if (!get().token || get().validated) return Promise.resolve()
			const version = getSessionVersion()
			set({ validating: true, error: '' })
			const operation = api('/auth/me').then(user => {
				if (version !== getSessionVersion()) return
				sessionStorage.setItem('user', JSON.stringify(user))
				set({ user, validated: true })
			}).catch(error => {
				if (version === getSessionVersion()) set({ error: error.message })
			}).finally(() => {
				if (validation === operation) validation = null
				if (version === getSessionVersion()) set({ validating: false })
			})
			validation = operation
			return operation
		},
		logout: () => {
			api('/auth/logout', { method: 'POST' }).catch(() => {})
			clearSession()
		},
	}
})

onUnauthorized(() => useAuthStore.getState().clearSession())
