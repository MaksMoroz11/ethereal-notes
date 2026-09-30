const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

let token = null
let sessionVersion = 0
const sessionListeners = new Set()
let unauthorizedHandler = () => {}

export class StaleRequestError extends Error {
	constructor() { super('Запрос относится к предыдущей сессии'); this.name = 'StaleRequestError' }
}

export const getSessionVersion = () => sessionVersion
export const onSessionChange = listener => { sessionListeners.add(listener); return () => sessionListeners.delete(listener) }
export const onUnauthorized = handler => { unauthorizedHandler = handler }

export function setToken(value) {
	const previous = token
	if (previous === value) return
	token = value
	sessionVersion += 1
	for (const listener of sessionListeners) listener(value, previous)
}

export async function api(path, options = {}) {
	const version = sessionVersion
	const requestToken = token
	const headers = { ...options.headers }
	if (options.body !== undefined) headers['Content-Type'] = 'application/json'
	if (token) headers['Authorization'] = `Bearer ${token}`

	const response = await fetch(`${BASE_URL}${path}`, {
		method: options.method || 'GET',
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		signal: options.signal,
	})
	if (version !== sessionVersion) throw new StaleRequestError()
	if (response.status === 401 && requestToken && !['/auth/login', '/auth/register'].includes(path)) {
		unauthorizedHandler()
		throw new Error('Сессия истекла. Войдите снова')
	}

	if (response.status === 204) return null

	const data = await response.json().catch(() => null)
	if (version !== sessionVersion) throw new StaleRequestError()
	if (!response.ok) {
		const message = data && data.detail ? data.detail : 'Ошибка запроса'
		throw new Error(typeof message === 'string' ? message : 'Ошибка запроса')
	}
	return data
}
