import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { getSessionVersion, setSession } from '@/shared/api/client'
import { useAuthStore } from '@/shared/store/authStore'
import { deferred, response } from '@/test/fixtures'
import Header from './Header'

vi.mock('./UserMenu', () => ({ default: ({ login }) => <button>{login}</button> }))
vi.mock('./NotificationBell', () => ({ default: () => null }))

beforeEach(() => {
	setSession(null)
	useAuthStore.setState({ authenticated: false, user: null, validated: false, validating: false, error: '' })
	vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => setSession(null))

it('shows session checking instead of a login link while a new tab restores its cookie', async () => {
	const me = deferred(), csrf = deferred()
	fetch.mockReturnValueOnce(me.promise).mockReturnValueOnce(csrf.promise)
	render(<MemoryRouter><Header /></MemoryRouter>)
	expect(screen.getByRole('status')).toHaveTextContent('Проверка сессии…')
	expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument()
	await act(async () => {
		me.resolve(response({ id: 1, login: 'owner' }))
		csrf.resolve(response({ csrf_token: 'csrf' }))
	})
	expect(await screen.findByRole('button', { name: 'owner' })).toBeInTheDocument()
	expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument()
})

it('shows a login link only after the server confirms there is no session', async () => {
	fetch.mockImplementation(() => Promise.resolve(response({ code: 'unauthorized' }, 401)))
	render(<MemoryRouter><Header /></MemoryRouter>)
	expect(await screen.findByRole('link', { name: 'Войти' })).toBeInTheDocument()
})

it('detects a cookie on returning to an already validated guest tab', async () => {
	useAuthStore.setState({ validated: true })
	fetch.mockResolvedValueOnce(response({ id: 1, login: 'owner' }))
		.mockResolvedValueOnce(response({ csrf_token: 'csrf' }))
	render(<MemoryRouter><Header /></MemoryRouter>)
	expect(fetch).not.toHaveBeenCalled()
	await act(async () => window.dispatchEvent(new Event('focus')))
	expect(await screen.findByRole('button', { name: 'owner' })).toBeInTheDocument()
})

it('revalidates the same account without changing the session or clearing private state', async () => {
	setSession(1)
	useAuthStore.setState({ authenticated: true, user: { id: 1, login: 'owner' }, validated: true })
	const version = getSessionVersion()
	fetch.mockResolvedValueOnce(response({ id: 1, login: 'owner' }))
		.mockResolvedValueOnce(response({ csrf_token: 'new-csrf' }))
	render(<MemoryRouter><Header /></MemoryRouter>)
	await act(async () => window.dispatchEvent(new Event('focus')))
	expect(getSessionVersion()).toBe(version)
	expect(useAuthStore.getState().authenticated).toBe(true)
	expect(screen.getByRole('button', { name: 'owner' })).toBeInTheDocument()
})

it('keeps a confirmed account during a temporary network error', async () => {
	setSession(1)
	useAuthStore.setState({ authenticated: true, user: { id: 1, login: 'owner' }, validated: true })
	fetch.mockRejectedValue(new TypeError('Network unavailable'))
	render(<MemoryRouter><Header /></MemoryRouter>)
	await act(async () => window.dispatchEvent(new Event('online')))
	expect(useAuthStore.getState().authenticated).toBe(true)
	expect(screen.getByRole('button', { name: 'owner' })).toBeInTheDocument()
})

it('offers retry without showing a false guest state when the cookie check fails', async () => {
	fetch.mockRejectedValue(new TypeError('Network unavailable'))
	render(<MemoryRouter><Header /></MemoryRouter>)
	expect(await screen.findByRole('button', { name: 'Повторить' })).toBeInTheDocument()
	expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument()
})
