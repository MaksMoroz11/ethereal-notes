import { create } from 'zustand'
import { api } from '../api/client'

let request = null
export const usePrivacyStore = create(set => ({
	config: null, error: '',
	load: () => {
		if (request) return request
		request = api('/auth/privacy', { silent: true }).then(config => set({ config, error: '' }))
			.catch(error => set({ error: error.message })).finally(() => { request = null })
		return request
	},
}))
