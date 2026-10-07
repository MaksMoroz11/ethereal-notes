import { actionText } from '../messages/notifications'
import { errorMessages } from '../messages/errors'
import { toast } from '../store/toastStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
let identity = null
let csrf = null
let sessionVersion = 0
const sessionListeners = new Set()
let unauthorizedHandler = () => {}

export class StaleRequestError extends Error {
    constructor() { super('Запрос относится к предыдущей сессии'); this.name = 'StaleRequestError' }
}
export class ApiError extends Error {
    constructor(message, code, status) { super(message); this.code = code; this.status = status }
}
export const getSessionVersion = () => sessionVersion
export const onSessionChange = listener => { sessionListeners.add(listener); return () => sessionListeners.delete(listener) }
export const onUnauthorized = handler => { unauthorizedHandler = handler }
export const setCsrf = value => { csrf = value }
export function setSession(value) {
    const previous = identity
    identity = value
    csrf = null
    sessionVersion += 1
    for (const listener of sessionListeners) listener(value, previous)
}

export async function api(path, options = {}) {
    const version = sessionVersion
    const requestIdentity = identity
    const method = options.method || 'GET'
    const headers = { ...options.headers }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    if (!['GET', 'HEAD'].includes(method) && csrf) headers['X-CSRF-Token'] = csrf
    let response
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method, headers, credentials: 'include', cache: 'no-store',
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: options.signal,
        })
    } catch (error) {
        if (version !== sessionVersion) throw new StaleRequestError()
        if (!options.silent && error.name !== 'AbortError') toast(actionText.offline, 'error')
        throw error
    }
    if (version !== sessionVersion) throw new StaleRequestError()
    if (response.status === 401 && requestIdentity && !['/auth/login', '/auth/register'].includes(path)) {
        unauthorizedHandler()
        throw new ApiError(errorMessages.unauthorized, 'unauthorized', 401)
    }
    if (response.status === 204) {
        if (!options.silent && method === 'DELETE') toast(actionText.deleted)
        return null
    }
    if (options.blob && response.ok) return response.blob()
    const data = await response.json().catch(() => null)
    if (version !== sessionVersion) throw new StaleRequestError()
    if (!response.ok) {
        const message = data?.code === 'request_failed' || data?.code === 'not_found'
            ? data?.detail : errorMessages[data?.code] || data?.detail
        const error = new ApiError(typeof message === 'string' ? message : errorMessages.request_failed, data?.code, response.status)
        if (!options.silent) toast(error.message, 'error')
        throw error
    }
    if (!options.silent && method !== 'GET' && !path.startsWith('/auth') && !path.startsWith('/notifications') && !path.includes('/versions')) {
        toast(method === 'DELETE' ? actionText.deleted : path.endsWith('/move') ? actionText.moved : actionText.saved)
    }
    return data
}
