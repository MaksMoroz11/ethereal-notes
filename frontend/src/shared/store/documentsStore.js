import { create } from 'zustand'
import { api } from '../api/client'

export const useDocumentsStore = create((set, get) => ({
	documents: [],
	activeId: null,
	loading: false,

	loadDocuments: async () => {
		set({ loading: true })
		try {
			const documents = await api('/documents')
			set(state => ({
				documents,
				activeId: documents.some(doc => doc.id === state.activeId)
					? state.activeId
					: documents[0]?.id ?? null,
			}))
		} finally {
			set({ loading: false })
		}
	},

	createDocument: async title => {
		const document = await api('/documents', { method: 'POST', body: { title } })
		set(state => ({
			documents: [document, ...state.documents],
			activeId: document.id,
		}))
	},

	selectDocument: id => set({ activeId: id }),

	deleteDocument: async id => {
		await api(`/documents/${id}`, { method: 'DELETE' })
		set(state => {
			const documents = state.documents.filter(doc => doc.id !== id)
			return {
				documents,
				activeId: state.activeId === id ? documents[0]?.id ?? null : state.activeId,
			}
		})
	},

	updateDocument: async (id, changes) => {
		const document = await api(`/documents/${id}`, { method: 'PATCH', body: changes })
		set(state => ({
			documents: state.documents.map(doc => (doc.id === id ? document : doc)),
		}))
	},

	saveVersion: async (id, snapshot) => {
		const current = get().documents.find(doc => doc.id === id)
		const document = await api(`/documents/${id}/versions`, {
			method: 'POST',
			body: {
				title: snapshot?.title ?? current?.title,
				content: snapshot?.content ?? current?.content,
			},
		})
		set(state => ({
			documents: state.documents.map(doc => (doc.id === id ? document : doc)),
		}))
	},

	restoreVersion: async (docId, versionId) => {
		const document = await api(`/documents/${docId}/restore/${versionId}`, { method: 'POST' })
		set(state => ({
			documents: state.documents.map(doc => (doc.id === docId ? document : doc)),
		}))
	},
}))
