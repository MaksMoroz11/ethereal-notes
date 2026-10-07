import { create } from 'zustand'
import { api, ApiError, setSession, setCsrf, onUnauthorized, getSessionVersion } from '../api/client'
import { encryptPassword } from '../lib/encryptPassword'
import { errorMessages } from '../messages/errors'

sessionStorage.removeItem('token')
sessionStorage.removeItem('user')
let validation = null
const SESSION_SIGNAL = 'ethereal-notes:session-change'
function broadcast() { localStorage.setItem(SESSION_SIGNAL, `${Date.now()}:${Math.random()}`) }

export const useAuthStore = create((set, get) => {
    let authentication = null
    function clearSession({ broadcastChange = true } = {}) {
        setSession(null)
        validation = null
        set({ authenticated: false, user: null, validated: true, validating: false, error: '' })
        if (broadcastChange) broadcast()
    }
    async function performAuthentication(path, login, password, extra) {
        if (!get().authenticated) await get().validateSession({ force: true })
        if (!get().validated) throw new Error(get().error || errorMessages.request_failed)
        if (get().authenticated) throw new ApiError(errorMessages.already_authenticated, 'already_authenticated', 409)
        const version = getSessionVersion()
        const encrypted = await encryptPassword(password)
        let data
        try {
            data = await api(path, { method: 'POST', body: { login, ...encrypted, ...extra } })
        } catch (error) {
            if (error.code === 'already_authenticated') await get().validateSession({ force: true })
            throw error
        }
        if (version !== getSessionVersion()) return
        setSession(data.user.id)
        setCsrf(data.csrf_token)
        set({ authenticated: true, user: data.user, validated: true, validating: false, error: '' })
        broadcast()
    }
    function authenticate(path, login, password, extra = {}) {
        if (authentication) return authentication
        const operation = performAuthentication(path, login, password, extra).finally(() => {
            if (authentication === operation) authentication = null
        })
        authentication = operation
        return operation
    }
    return {
        authenticated: false, user: null, validated: false, validating: false, error: '',
        register: (login, password, extra) => authenticate('/auth/register', login, password, extra),
        login: (login, password, remember = false) => authenticate('/auth/login', login, password, { remember }),
        clearSession,
        validateSession: ({ force = false } = {}) => {
            if (validation) return validation
            if (get().validated && !force) return Promise.resolve()
            const version = getSessionVersion()
            set({ validating: true, error: '' })
            const operation = Promise.all([api('/auth/me', { silent: true }), api('/auth/csrf', { silent: true })]).then(([user, data]) => {
                if (version !== getSessionVersion()) return
                if (!get().authenticated || get().user?.id !== user.id) setSession(user.id)
                setCsrf(data.csrf_token)
                set({ authenticated: true, user, validated: true, validating: false })
            }).catch(error => {
                if (version !== getSessionVersion()) return
                if (error.status === 401) clearSession({ broadcastChange: false })
                else set({ error: error.message, validating: false, validated: get().authenticated })
            }).finally(() => { if (validation === operation) validation = null })
            validation = operation
            return operation
        },
        logout: async () => {
            try {
                await api('/auth/logout', { method: 'POST' })
                clearSession()
            } catch (error) {
                if (error.status === 401) clearSession()
                else throw error
            }
        },
    }
})

onUnauthorized(() => useAuthStore.getState().clearSession())
window.addEventListener('storage', event => {
    if (event.key !== SESSION_SIGNAL) return
    useAuthStore.getState().clearSession({ broadcastChange: false })
    useAuthStore.setState({ validated: false })
    useAuthStore.getState().validateSession()
})
