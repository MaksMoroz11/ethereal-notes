import { beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); sessionStorage.clear() })

it('discards malformed stored user data without crashing', async () => {
	sessionStorage.setItem('token', 'old-token')
	sessionStorage.setItem('user', '{bad json')
	const { useAuthStore } = await import('./authStore')
	expect(useAuthStore.getState().authenticated).toBe(false)
	expect(sessionStorage.getItem('token')).toBeNull()
})

it('discards legacy tokens and validates cookie sessions on the server', async () => {
	sessionStorage.setItem('token', 'valid-token')
	sessionStorage.setItem('user', JSON.stringify({ id: 1, login: 'owner' }))
	const { useAuthStore } = await import('./authStore')
	expect(useAuthStore.getState().validated).toBe(false)
	expect(useAuthStore.getState().authenticated).toBe(false)
	expect(sessionStorage.getItem('token')).toBeNull()
})
