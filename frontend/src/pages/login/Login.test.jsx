import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setSession } from '@/shared/api/client'
import { useAuthStore } from '@/shared/store/authStore'
import { usePrivacyStore } from '@/shared/store/privacyStore'
import { deferred, response } from '@/test/fixtures'
import Login from './index'

vi.mock('@/shared/lib/encryptPassword', () => ({ encryptPassword: async () => ({ encrypted_password: 'encrypted' }) }))

beforeEach(() => {
	setSession(null)
	useAuthStore.setState({ authenticated: false, user: null, validated: true, error: '' })
	usePrivacyStore.setState({ config: { consent_version: '2026-10-07' }, error: '' })
	vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => setSession(null))

function renderLogin(path = '/login') {
	return render(<MemoryRouter initialEntries={[path]}><Routes>
		<Route path="/login" element={<Login />} />
		<Route path="/dashboard" element={<p>Рабочая область</p>} />
	</Routes></MemoryRouter>)
}

for (const path of ['/login', '/login?mode=register']) {
	it(`redirects an authenticated visitor from ${path} without rendering a form`, async () => {
		useAuthStore.setState({ authenticated: true, user: { id: 1, login: 'owner' } })
		renderLogin(path)
		expect(await screen.findByText('Рабочая область')).toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: 'Логин' })).not.toBeInTheDocument()
		expect(fetch).not.toHaveBeenCalled()
	})
}

it('checks the cookie on direct navigation before showing registration', async () => {
	useAuthStore.setState({ validated: false })
	const me = deferred(), csrf = deferred()
	fetch.mockReturnValueOnce(me.promise).mockReturnValueOnce(csrf.promise)
	renderLogin('/login?mode=register')
	expect(screen.getByText('Проверка сессии…')).toBeInTheDocument()
	expect(screen.queryByRole('button', { name: 'Создать аккаунт' })).not.toBeInTheDocument()
	await act(async () => {
		me.resolve(response({ id: 1, login: 'owner' }))
		csrf.resolve(response({ csrf_token: 'csrf' }))
	})
	expect(await screen.findByText('Рабочая область')).toBeInTheDocument()
	expect(fetch.mock.calls.every(call => (call[1].method || 'GET') === 'GET')).toBe(true)
})

it('rejects direct store login and registration when already authenticated', async () => {
	useAuthStore.setState({ authenticated: true, user: { id: 1, login: 'owner' } })
	await expect(useAuthStore.getState().login('owner', 'password')).rejects.toMatchObject({ code: 'already_authenticated' })
	await expect(useAuthStore.getState().register('next', 'password', {})).rejects.toMatchObject({ code: 'already_authenticated' })
	expect(fetch).not.toHaveBeenCalled()
})

it('shares a pending authentication request instead of creating duplicate sessions', async () => {
	const request = deferred()
	fetch.mockReturnValueOnce(request.promise)
	const first = useAuthStore.getState().login('owner', 'password')
	const second = useAuthStore.getState().login('owner', 'password')
	expect(second).toBe(first)
	await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
	request.resolve(response({ user: { id: 1, login: 'owner' }, csrf_token: 'csrf' }))
	await Promise.all([first, second])
	expect(useAuthStore.getState().authenticated).toBe(true)
})

it('checks a restored cookie before a direct store request can create a session', async () => {
	useAuthStore.setState({ validated: false })
	fetch.mockResolvedValueOnce(response({ id: 1, login: 'owner' }))
		.mockResolvedValueOnce(response({ csrf_token: 'csrf' }))
	await expect(useAuthStore.getState().login('next', 'password')).rejects.toMatchObject({ code: 'already_authenticated' })
	expect(fetch).toHaveBeenCalledTimes(2)
	expect(fetch.mock.calls.every(call => call[1].method === 'GET')).toBe(true)
})
