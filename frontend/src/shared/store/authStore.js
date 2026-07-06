import { create } from 'zustand'
import { api, setToken } from '../api/client'

const savedToken = sessionStorage.getItem('token')
const savedUser = sessionStorage.getItem('user')
if (savedToken) setToken(savedToken)

export const useAuthStore = create(set => ({
	token: savedToken || null,
	user: savedUser ? JSON.parse(savedUser) : null,

	register: async (login, password) => {
		const data = await api('/auth/register', { method: 'POST', body: { login, password } })
		setToken(data.token)
		sessionStorage.setItem('token', data.token)
		sessionStorage.setItem('user', JSON.stringify(data.user))
		set({ token: data.token, user: data.user })
	},

	login: async (login, password) => {
		const data = await api('/auth/login', { method: 'POST', body: { login, password } })
		setToken(data.token)
		sessionStorage.setItem('token', data.token)
		sessionStorage.setItem('user', JSON.stringify(data.user))
		set({ token: data.token, user: data.user })
	},

	logout: () => {
		api('/auth/logout', { method: 'POST' }).catch(() => {})
		setToken(null)
		sessionStorage.removeItem('token')
		sessionStorage.removeItem('user')
		set({ token: null, user: null })
	},
}))
