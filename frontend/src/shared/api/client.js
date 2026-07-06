const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

let token = null

export function setToken(value) {
	token = value
}

export async function api(path, options = {}) {
	const headers = { ...options.headers }
	if (options.body !== undefined) headers['Content-Type'] = 'application/json'
	if (token) headers['Authorization'] = `Bearer ${token}`

	const response = await fetch(`${BASE_URL}${path}`, {
		method: options.method || 'GET',
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	})

	if (response.status === 204) return null

	const data = await response.json().catch(() => null)
	if (!response.ok) {
		const message = data && data.detail ? data.detail : 'Ошибка запроса'
		throw new Error(typeof message === 'string' ? message : 'Ошибка запроса')
	}
	return data
}
