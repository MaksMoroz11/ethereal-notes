import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, setToken } from '../api/client'
import { useAuthStore } from './authStore'
import { useWorkspaceStore } from './workspaceStore'
import { useDocumentsStore } from './documentsStore'
import { useFoldersStore } from './foldersStore'
import { useBoardsStore } from './boardsStore'
import { draftKey, readDraft } from '../lib/documentDrafts'
import { deferred, response, document } from '@/test/fixtures'

vi.mock('../lib/encryptPassword', () => ({ encryptPassword: async () => ({ encrypted_password: 'encrypted' }) }))

function prepare() {
	setToken(null)
	sessionStorage.clear()
	localStorage.clear()
	setToken('session-1')
	useAuthStore.setState({ token: 'session-1', user: { id: 1, login: 'owner' }, validated: true, error: '' })
	useWorkspaceStore.setState({ activeId: 1, workspaces: [{ id: 1, role: 'owner' }] })
	useDocumentsStore.setState({ documents: [document], activeId: document.id })
	vi.stubGlobal('fetch', vi.fn())
}
beforeEach(prepare)

describe('workspace and session isolation', () => {
	for (const [store, method, key] of [
		[useDocumentsStore, 'loadDocuments', 'documents'],
		[useFoldersStore, 'loadFolders', 'boardFolders'],
		[useWorkspaceStore, 'loadMembers', 'members'],
		[useBoardsStore, 'loadBoards', 'boards'],
	]) {
		it(`ignores late ${method} responses after switching spaces`, async () => {
			const first = deferred(), second = deferred()
			fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
			const oldRequest = store.getState()[method](1)
			useWorkspaceStore.setState({ activeId: 2 })
			expect(store.getState()[key]).toEqual([])
			const newRequest = store.getState()[method](2)
			second.resolve(response([{ id: 'new' }]))
			await newRequest
			first.resolve(response([{ id: 'old' }]))
			await oldRequest
			expect(store.getState()[key]).toEqual([{ id: 'new' }])
		})
	}
	it('loads the two folder kinds independently', async () => {
		fetch.mockResolvedValueOnce(response([{ id: 'board-folder' }])).mockResolvedValueOnce(response([{ id: 'document-folder' }]))
		await Promise.all([useFoldersStore.getState().loadFolders(1, 'board'), useFoldersStore.getState().loadFolders(1, 'document')])
		expect(useFoldersStore.getState().boardFolders[0].id).toBe('board-folder')
		expect(useFoldersStore.getState().documentFolders[0].id).toBe('document-folder')
	})
	it('cannot insert a document created in the previous workspace', async () => {
		const request = deferred()
		fetch.mockReturnValueOnce(request.promise)
		const creation = useDocumentsStore.getState().createDocument('New')
		useWorkspaceStore.setState({ activeId: 2 })
		request.resolve(response({ ...document, id: 'created-old' }))
		await creation
		expect(useDocumentsStore.getState().documents).toEqual([])
	})
	it('clears all private state and drafts when the authenticated session expires', async () => {
		useDocumentsStore.getState().editDraft(document.id, { content: 'Private draft' })
		useBoardsStore.setState({ boards: [{ id: 1 }] })
		useFoldersStore.setState({ boardFolders: [{ id: 'folder' }] })
		fetch.mockResolvedValueOnce(response({ detail: 'expired' }, 401))
		await expect(api('/auth/me')).rejects.toThrow('Сессия истекла')
		expect(useAuthStore.getState().token).toBeNull()
		expect(useWorkspaceStore.getState().workspaces).toEqual([])
		expect(useDocumentsStore.getState().documents).toEqual([])
		expect(useBoardsStore.getState().boards).toEqual([])
		expect(useFoldersStore.getState().boardFolders).toEqual([])
		expect(readDraft(1, document.id)).toBeNull()
	})
	it('does not let an old response log out a newly logged-in account', async () => {
		const old = deferred()
		fetch.mockReturnValueOnce(old.promise)
		const request = api('/auth/me').catch(error => error)
		fetch.mockResolvedValueOnce(response({ token: 'session-2', user: { id: 2, login: 'next' } }))
		await useAuthStore.getState().login('next', 'password')
		old.resolve(response({ detail: 'expired' }, 401))
		expect((await request).name).toBe('StaleRequestError')
		expect(useAuthStore.getState().token).toBe('session-2')
		expect(useDocumentsStore.getState().documents).toEqual([])
	})
	it('validates the restored session through auth/me', async () => {
		useAuthStore.setState({ validated: false })
		fetch.mockResolvedValueOnce(response({ id: 1, login: 'confirmed' }))
		await useAuthStore.getState().validateSession()
		expect(useAuthStore.getState().validated).toBe(true)
		expect(useAuthStore.getState().user.login).toBe('confirmed')
	})
})

describe('document saves and restoration', () => {
	it('does not let a delayed document listing replace a newer saved state', async () => {
		const listing = deferred()
		fetch.mockReturnValueOnce(listing.promise).mockResolvedValueOnce(response({ ...document, content: 'Newest' }))
		const loaded = useDocumentsStore.getState().loadDocuments(1)
		useDocumentsStore.getState().editDraft(document.id, { content: 'Newest' })
		await useDocumentsStore.getState().saveDraft(document.id)
		listing.resolve(response([document]))
		await loaded
		expect(useDocumentsStore.getState().documents[0].content).toBe('Newest')
	})
	it('does not resurrect a document deleted while its listing was loading', async () => {
		const listing = deferred()
		fetch.mockReturnValueOnce(listing.promise).mockResolvedValueOnce(new Response(null, { status: 204 }))
		const loaded = useDocumentsStore.getState().loadDocuments(1)
		await useDocumentsStore.getState().deleteDocument(document.id)
		listing.resolve(response([document]))
		await loaded
		expect(useDocumentsStore.getState().documents).toEqual([])
	})
	it('preserves edits during a delayed save and drains the latest draft next', async () => {
		const first = deferred(), second = deferred()
		fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
		useDocumentsStore.getState().editDraft(document.id, { content: 'First' })
		const saved = useDocumentsStore.getState().saveDraft(document.id)
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
		useDocumentsStore.getState().editDraft(document.id, { content: 'Second' })
		first.resolve(response({ ...document, content: 'First' }))
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
		expect(useDocumentsStore.getState().drafts[document.id].content).toBe('Second')
		expect(readDraft(1, document.id).content).toBe('Second')
		expect(JSON.parse(fetch.mock.calls[1][1].body).content).toBe('Second')
		second.resolve(response({ ...document, content: 'Second' }))
		await saved
		expect(useDocumentsStore.getState().documents[0].content).toBe('Second')
		expect(readDraft(1, document.id)).toBeNull()
	})
	it('preserves a change back to the old content while saving', async () => {
		const first = deferred()
		fetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response(document))
		useDocumentsStore.getState().editDraft(document.id, { content: 'First' })
		const saved = useDocumentsStore.getState().saveDraft(document.id)
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
		useDocumentsStore.getState().editDraft(document.id, { content: 'Original' })
		first.resolve(response({ ...document, content: 'First' }))
		await saved
		expect(fetch).toHaveBeenCalledTimes(2)
		expect(useDocumentsStore.getState().documents[0].content).toBe('Original')
	})
	it('stops draining newer edits when autosave is switched off during a request', async () => {
		let enabled = true
		const first = deferred()
		fetch.mockReturnValueOnce(first.promise)
		useDocumentsStore.getState().editDraft(document.id, { content: 'First' })
		const saved = useDocumentsStore.getState().saveDraft(document.id, { drain: () => enabled })
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
		useDocumentsStore.getState().editDraft(document.id, { content: 'Second' })
		enabled = false
		first.resolve(response({ ...document, content: 'First' }))
		await saved
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(readDraft(1, document.id).content).toBe('Second')
	})
	it('keeps a draft and reports a failed save', async () => {
		useDocumentsStore.getState().editDraft(document.id, { content: 'Unsaved' })
		fetch.mockResolvedValueOnce(response({ detail: 'Save failed' }, 500))
		await expect(useDocumentsStore.getState().saveDraft(document.id)).rejects.toThrow('Save failed')
		expect(readDraft(1, document.id).content).toBe('Unsaved')
		expect(useDocumentsStore.getState().documents[0].content).toBe('Original')
		expect(useDocumentsStore.getState().saveErrors[document.id]).toBe('Save failed')
	})
	it('serializes restoration after a save and does not drain edits over the restored version', async () => {
		const first = deferred(), restore = deferred()
		fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(restore.promise)
		useDocumentsStore.getState().editDraft(document.id, { content: 'First' })
		const save = useDocumentsStore.getState().saveDraft(document.id)
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
		useDocumentsStore.getState().editDraft(document.id, { content: 'Second' })
		const restored = useDocumentsStore.getState().restoreVersion(document.id, 7)
		first.resolve(response({ ...document, content: 'First' }))
		await save
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
		expect(fetch.mock.calls[1][0]).toContain('/restore/7')
		restore.resolve(response({ ...document, content: 'Restored' }))
		await restored
		expect(useDocumentsStore.getState().documents[0].content).toBe('Restored')
		expect(readDraft(1, document.id)).toBeNull()
	})
	it('leaves the current document and draft intact when restoration fails', async () => {
		useDocumentsStore.getState().editDraft(document.id, { content: 'Draft' })
		fetch.mockResolvedValueOnce(response({ detail: 'Restore failed' }, 500))
		await expect(useDocumentsStore.getState().restoreVersion(document.id, 7)).rejects.toThrow('Restore failed')
		expect(useDocumentsStore.getState().documents[0].content).toBe('Original')
		expect(readDraft(1, document.id).content).toBe('Draft')
		expect(useDocumentsStore.getState().restoring[document.id]).toBe(false)
	})
	it('reads a persisted draft after component state is lost and isolates users', async () => {
		sessionStorage.setItem(draftKey(1, document.id), JSON.stringify({ title: 'Document', content: 'Recovered' }))
		expect(readDraft(2, document.id)).toBeNull()
		fetch.mockResolvedValueOnce(response({ ...document, content: 'Recovered' }))
		await useDocumentsStore.getState().saveDraft(document.id)
		expect(JSON.parse(fetch.mock.calls[0][1].body).content).toBe('Recovered')
	})
	it('removes a local draft only after document deletion succeeds', async () => {
		useDocumentsStore.getState().editDraft(document.id, { content: 'Draft' })
		fetch.mockResolvedValueOnce(response({ detail: 'failed' }, 500))
		await expect(useDocumentsStore.getState().deleteDocument(document.id)).rejects.toThrow()
		expect(readDraft(1, document.id)).not.toBeNull()
		fetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
		await useDocumentsStore.getState().deleteDocument(document.id)
		expect(readDraft(1, document.id)).toBeNull()
	})
})
