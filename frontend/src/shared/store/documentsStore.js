import { create } from 'zustand'
import { api, getSessionVersion, onSessionChange, StaleRequestError } from '../api/client'
import { useWorkspaceStore, workspaceRequestIsCurrent } from './workspaceStore'
import { useAuthStore } from './authStore'
import { readDraft, writeDraft, removeDraft, clearDrafts, snapshotOf, sameSnapshot } from '../lib/documentDrafts'

const records = new Map()
const recordChanges = new Map()
const deletedRecords = new Set()
let mutationRevision = 0
const queues = new Map()
let loadRequest = 0
const initial = { documents: [], activeId: null, loading: false, error: '', drafts: {}, statuses: {}, saveErrors: {}, restoring: {} }

function enqueue(id, session, operation) {
	const key = `${session}:${id}`
	const previous = queues.get(key) || Promise.resolve()
	const result = previous.catch(() => {}).then(() => {
		if (session !== getSessionVersion()) throw new StaleRequestError()
		return operation()
	})
	queues.set(key, result)
	result.finally(() => { if (queues.get(key) === result) queues.delete(key) }).catch(() => {})
	return result
}

export const useDocumentsStore = create((set, get) => {
	const documentFor = id => get().documents.find(doc => doc.id === id) || records.get(id)
	const userId = () => useAuthStore.getState().user?.id
	const draftFor = id => get().drafts[id] || readDraft(userId(), id) || documentFor(id)
	const status = (id, value, error = '') => set(state => ({ statuses: { ...state.statuses, [id]: value }, saveErrors: { ...state.saveErrors, [id]: error } }))
	function accept(document) {
		if (deletedRecords.has(document.id)) return document
		records.set(document.id, document)
		recordChanges.set(document.id, ++mutationRevision)
		set(state => ({ documents: state.documents.map(doc => doc.id === document.id ? document : doc) }))
		return document
	}
	function discardDraft(id, owner) {
		removeDraft(owner, id)
		set(state => {
			const drafts = { ...state.drafts }
			delete drafts[id]
			return { drafts }
		})
	}
	return {
		...initial,
		loadDocuments: async workspaceId => {
			const id = workspaceId ?? useWorkspaceStore.getState().activeId
			const request = ++loadRequest
			const session = getSessionVersion()
			const revision = mutationRevision
			set({ loading: true, error: '' })
			try {
				if (!id) { set({ documents: [], activeId: null }); return }
				const fetched = await api(`/documents?workspace_id=${id}`)
				if (request !== loadRequest || !workspaceRequestIsCurrent(id, session)) return
				const documents = fetched.filter(doc => !deletedRecords.has(doc.id)).map(doc =>
					(recordChanges.get(doc.id) ?? 0) > revision ? records.get(doc.id) ?? doc : doc)
				const ids = new Set(documents.map(doc => doc.id))
				documents.push(...get().documents.filter(doc => !ids.has(doc.id) && (recordChanges.get(doc.id) ?? 0) > revision && !deletedRecords.has(doc.id)))
				for (const doc of documents) records.set(doc.id, doc)
				set(state => ({ documents, activeId: documents.some(doc => doc.id === state.activeId) ? state.activeId : documents[0]?.id ?? null }))
			} catch (error) {
				if (request !== loadRequest || !workspaceRequestIsCurrent(id, session)) return
				set({ error: error.message })
				throw error
			} finally {
				if (request === loadRequest && session === getSessionVersion()) set({ loading: false })
			}
		},
		createDocument: async (title, folderId = null) => {
			const workspaceId = useWorkspaceStore.getState().activeId
			const session = getSessionVersion()
			if (!workspaceId) return
			const document = await api('/documents', { method: 'POST', body: { title, workspace_id: workspaceId, folder_id: folderId } })
			records.set(document.id, document)
			recordChanges.set(document.id, ++mutationRevision)
			if (workspaceRequestIsCurrent(workspaceId, session)) set(state => ({ documents: [document, ...state.documents.filter(doc => doc.id !== document.id)], activeId: document.id }))
		},
		selectDocument: id => set({ activeId: id }),
		removeDocumentsInFolders: folderIds => {
			const ids = new Set([...records.values(), ...get().documents].filter(doc => folderIds.has(doc.folder_id)).map(doc => doc.id))
			for (const id of ids) {
				deletedRecords.add(id)
				recordChanges.set(id, ++mutationRevision)
				records.delete(id)
				discardDraft(id, userId())
			}
			set(state => {
				const documents = state.documents.filter(doc => !ids.has(doc.id))
				return { documents, activeId: ids.has(state.activeId) ? documents[0]?.id ?? null : state.activeId }
			})
		},
		editDraft: (id, changes) => {
			if (get().restoring[id]) return
			const current = draftFor(id)
			if (!current) return
			const draft = { title: current.title, content: current.content, ...changes }
			if (sameSnapshot(snapshotOf(draft), documentFor(id)) && !queues.has(`${getSessionVersion()}:${id}`)) {
				discardDraft(id, userId())
				status(id, 'saved')
				return
			}
			const stored = writeDraft(userId(), id, draft)
			set(state => ({ drafts: { ...state.drafts, [id]: draft } }))
			status(id, 'pending', stored ? '' : 'Не удалось сохранить локальный черновик. Сохраните документ на сервере.')
		},
		saveDraft: (id, { drain = true, enabled = () => true } = {}) => {
			const session = getSessionVersion()
			const owner = userId()
			return enqueue(id, session, async () => {
				if (!enabled()) return documentFor(id)
				while (!get().restoring[id]) {
					const document = documentFor(id)
					const draft = draftFor(id)
					if (!document || !draft) return document
					const snapshot = snapshotOf(draft)
					if (sameSnapshot(snapshot, document)) {
						discardDraft(id, owner)
						status(id, 'saved')
						return document
					}
					status(id, 'saving')
					try {
						const saved = await api(`/documents/${id}/versions`, { method: 'POST', body: snapshot })
						if (deletedRecords.has(id)) return saved
						accept(saved)
						const latestDraft = draftFor(id)
						if (sameSnapshot(snapshotOf(latestDraft), snapshot)) {
							discardDraft(id, owner)
							status(id, 'saved')
							return saved
						}
						status(id, 'pending')
						if (!(typeof drain === 'function' ? drain() : drain)) return saved
					} catch (error) {
						if (session === getSessionVersion()) status(id, 'pending', error.message)
						throw error
					}
				}
			})
		},
		updateDocument: (id, changes) => enqueue(id, getSessionVersion(), async () => accept(await api(`/documents/${id}`, { method: 'PATCH', body: changes }))),
		moveDocument: (id, folderId) => get().updateDocument(id, { folder_id: folderId }),
		deleteDocument: id => {
			const owner = userId()
			return enqueue(id, getSessionVersion(), async () => {
				await api(`/documents/${id}`, { method: 'DELETE' })
				deletedRecords.add(id)
				recordChanges.set(id, ++mutationRevision)
				records.delete(id)
				discardDraft(id, owner)
				set(state => {
					const documents = state.documents.filter(doc => doc.id !== id)
					return { documents, activeId: state.activeId === id ? documents[0]?.id ?? null : state.activeId }
				})
			})
		},
		restoreVersion: (id, versionId) => {
			const session = getSessionVersion()
			const owner = userId()
			if (get().restoring[id]) return Promise.reject(new Error('Откат уже выполняется'))
			set(state => ({ restoring: { ...state.restoring, [id]: true } }))
			status(id, 'saving')
			return enqueue(id, session, async () => {
				try {
					status(id, 'saving')
					const saved = accept(await api(`/documents/${id}/restore/${versionId}`, { method: 'POST' }))
					discardDraft(id, owner)
					status(id, 'saved')
					return saved
				} catch (error) {
					if (session === getSessionVersion()) status(id, 'pending', error.message)
					throw error
				} finally {
					if (session === getSessionVersion()) set(state => ({ restoring: { ...state.restoring, [id]: false } }))
				}
			})
		},
	}
})

onSessionChange((token, previous) => {
	loadRequest += 1
	records.clear()
	recordChanges.clear()
	deletedRecords.clear()
	mutationRevision = 0
	queues.clear()
	if (previous || !token) clearDrafts()
	useDocumentsStore.setState(initial)
})
useWorkspaceStore.subscribe((state, previous) => {
	if (state.activeId !== previous.activeId) {
		loadRequest += 1
		useDocumentsStore.setState({ documents: [], activeId: null, loading: false, error: '' })
	}
})
