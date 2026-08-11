import { create } from 'zustand'

const STORAGE_KEY = 'ethereal-documents'

function uid() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function load() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { documents: [], activeId: null }
		const data = JSON.parse(raw)
		return {
			documents: Array.isArray(data.documents) ? data.documents : [],
			activeId: data.activeId ?? null,
		}
	} catch {
		return { documents: [], activeId: null }
	}
}

function persist(state) {
	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ documents: state.documents, activeId: state.activeId })
	)
}

const initial = load()

export const useDocumentsStore = create((set, get) => ({
	documents: initial.documents,
	activeId: initial.activeId,

	createDocument: (title, authorLogin = '') => {
		const now = new Date().toISOString()
		const login = authorLogin || ''
		const doc = {
			id: uid(),
			title: title.trim() || 'Без названия',
			content: '',
			author_login: login,
			updated_by: login,
			created_at: now,
			updated_at: now,
			versions: [],
		}
		set(state => {
			const next = { documents: [doc, ...state.documents], activeId: doc.id }
			persist(next)
			return next
		})
	},

	selectDocument: id => {
		set(state => {
			const next = { ...state, activeId: id }
			persist(next)
			return { activeId: id }
		})
	},

	deleteDocument: id => {
		set(state => {
			const documents = state.documents.filter(doc => doc.id !== id)
			const next = {
				documents,
				activeId: state.activeId === id ? documents[0]?.id ?? null : state.activeId,
			}
			persist(next)
			return next
		})
	},

	updateDocument: (id, changes, updatedBy = '') => {
		const now = new Date().toISOString()
		set(state => {
			const documents = state.documents.map(doc =>
				doc.id === id
					? {
							...doc,
							...changes,
							updated_at: now,
							updated_by: updatedBy || doc.updated_by || '',
						}
					: doc
			)
			const next = { ...state, documents }
			persist(next)
			return { documents }
		})
	},

	saveVersion: (id, snapshot) => {
		const doc = get().documents.find(d => d.id === id)
		if (!doc) return
		const now = new Date().toISOString()
		const title = snapshot?.title ?? doc.title
		const content = snapshot?.content ?? doc.content
		const authorLogin = snapshot?.author_login || ''
		const version = {
			id: uid(),
			title,
			content,
			author_login: authorLogin,
			created_at: now,
		}
		set(state => {
			const documents = state.documents.map(d =>
				d.id === id
					? {
							...d,
							title,
							content,
							versions: [version, ...d.versions],
							updated_at: now,
							updated_by: authorLogin || d.updated_by || '',
						}
					: d
			)
			const next = { ...state, documents }
			persist(next)
			return { documents }
		})
	},

	restoreVersion: (docId, versionId, updatedBy = '') => {
		const doc = get().documents.find(d => d.id === docId)
		if (!doc) return
		const index = doc.versions.findIndex(v => v.id === versionId)
		if (index < 0) return
		const version = doc.versions[index]
		const now = new Date().toISOString()
		set(state => {
			const documents = state.documents.map(d =>
				d.id === docId
					? {
							...d,
							title: version.title,
							content: version.content,
							updated_at: now,
							updated_by: updatedBy || d.updated_by || '',
							versions: d.versions.slice(index),
						}
					: d
			)
			const next = { ...state, documents }
			persist(next)
			return { documents }
		})
	},
}))
