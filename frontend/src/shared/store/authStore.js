import { create } from 'zustand'
import { api, setSession, setCsrf, onUnauthorized, getSessionVersion } from '../api/client'
import { encryptPassword } from '../lib/encryptPassword'

sessionStorage.removeItem('token')
sessionStorage.removeItem('user')
let validation = null
const SESSION_SIGNAL = 'ethereal-notes:session-change'
function broadcast() { localStorage.setItem(SESSION_SIGNAL, `${Date.now()}:${Math.random()}`) }

export const useAuthStore = create((set, get) => {
    function clearSession({ broadcastChange = true } = {}) {
        setSession(null)
        validation = null
        set({ authenticated: false, user: null, validated: true, validating: false, error: '' })
        if (broadcastChange) broadcast()
    }
    async function authenticate(path, login, password, extra = {}) {
        const version = getSessionVersion()
        const encrypted = await encryptPassword(password)
        const data = await api(path, { method: 'POST', body: { login, ...encrypted, ...extra } })
        if (version !== getSessionVersion()) return
        setSession(data.user.id)
        setCsrf(data.csrf_token)
        set({ authenticated: true, user: data.user, validated: true, validating: false, error: '' })
        broadcast()
    }
    return {
        authenticated: false, user: null, validated: false, validating: false, error: '',
        register: (login, password, extra) => authenticate('/auth/register', login, password, extra),
        login: (login, password, remember = false) => authenticate('/auth/login', login, password, { remember }),
        clearSession,
        validateSession: () => {
            if (validation) return validation
            if (get().validated) return Promise.resolve()
            const version = getSessionVersion()
            set({ validating: true, error: '' })
            const operation = Promise.all([api('/auth/me', { silent: true }), api('/auth/csrf', { silent: true })]).then(([user, data]) => {
                if (version !== getSessionVersion()) return
                setSession(user.id)
                setCsrf(data.csrf_token)
                set({ authenticated: true, user, validated: true, validating: false })
            }).catch(error => {
                if (version !== getSessionVersion()) return
                if (error.status === 401) clearSession({ broadcastChange: false })
                else set({ error: error.message, validating: false })
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
