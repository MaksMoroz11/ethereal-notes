import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { api, setSession, setCsrf } from '../api/client'
import { useAuthStore } from './authStore'
import { useWorkspaceStore } from './workspaceStore'
import { useBoardsStore } from './boardsStore'
import { useDocumentsStore } from './documentsStore'
import { readDraft } from '../lib/documentDrafts'
import { document, deferred, response } from '@/test/fixtures'
import Dashboard from '@/pages/dashboard'
import Login from '@/pages/login'
import { usePrivacyStore } from './privacyStore'

const columns = [{ id: 'todo', title: 'План', position: 0 }, { id: 'done', title: 'Готово', position: 1 }]
const task = { id: 'task', title: 'Моя задача', column_id: 'todo', assignee_id: 2, author_id: 1, revision: 1, tags: [], uid: '1' }
beforeEach(() => {
	setSession(null)
	sessionStorage.clear()
	useAuthStore.setState({ user: { id: 2, login: 'member' }, authenticated: true, validated: true })
	setSession(2)
	setCsrf('csrf-secret')
	useWorkspaceStore.setState({ activeId: 1, workspaces: [{ id: 1, role: 'member' }], members: [] })
	useBoardsStore.setState({ workspaceId: 1, boards: [{ id: 10, revision: 1, title: 'Доска', columns, tasks: [task] }], activeId: 10 })
	useDocumentsStore.setState({ documents: [document], activeId: document.id })
	vi.stubGlobal('fetch', vi.fn())
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => setSession(null))

it('uses cookies and CSRF without exposing an authorization token', async () => {
	fetch.mockResolvedValueOnce(response({ id: 1 }))
	await api('/workspaces', { method: 'POST', body: { name: 'Команда' } })
	const options = fetch.mock.calls[0][1]
	expect(options.credentials).toBe('include')
	expect(options.headers['X-CSRF-Token']).toBe('csrf-secret')
	expect(options.headers.Authorization).toBeUndefined()
})

it('moves only the task locally, prevents duplicate moves and keeps sibling identities', async () => {
	const sibling = { ...task, id: 'other', title: 'Другая' }
	useBoardsStore.setState(state => ({ boards: [{ ...state.boards[0], tasks: [task, sibling] }] }))
	const request = deferred()
	fetch.mockReturnValueOnce(request.promise)
	const operation = useBoardsStore.getState().moveTask(task.id, 'done')
	await useBoardsStore.getState().moveTask(task.id, 'done')
	expect(fetch).toHaveBeenCalledTimes(1)
	expect(fetch.mock.calls[0][0]).toContain('/tasks/task/move')
	expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ column_id: 'done', expected_revision: 1 })
	request.resolve(response({ ...task, column_id: 'done', revision: 2 }))
	await operation
	expect(useBoardsStore.getState().boards[0].tasks[1]).toBe(sibling)
	expect(useBoardsStore.getState().boards[0].columns).toBe(columns)
	expect(useBoardsStore.getState().loading).toBe(false)
})

it('keeps the original task after a failed move', async () => {
	fetch.mockResolvedValueOnce(response({ detail: 'Denied' }, 403))
	await expect(useBoardsStore.getState().moveTask(task.id, 'done')).rejects.toThrow('Denied')
	expect(useBoardsStore.getState().boards[0].tasks[0]).toBe(task)
	expect(useBoardsStore.getState().moving[task.id]).toBe(false)
})

it('keeps the task dialog open while a member changes its column', async () => {
	render(<MemoryRouter initialEntries={['/dashboard?task=task']}><Dashboard /></MemoryRouter>)
	expect(screen.queryByRole('button', { name: 'Удалить задачу' })).not.toBeInTheDocument()
	fetch.mockResolvedValueOnce(response({ ...task, column_id: 'done', revision: 2 }))
	fireEvent.change(screen.getByLabelText('Колонка задачи'), { target: { value: 'done' } })
	await waitFor(() => expect(screen.getByLabelText('Колонка задачи')).toHaveValue('done'))
	expect(screen.getByRole('dialog')).toBeInTheDocument()
	expect(fetch).toHaveBeenCalledTimes(1)
})

it('updates a column without fetching all boards or resetting the view', async () => {
	fetch.mockResolvedValueOnce(response({ ...columns[0], title: 'Новый план' }))
	await useBoardsStore.getState().updateColumn('todo', { title: 'Новый план' })
	expect(fetch).toHaveBeenCalledTimes(1)
	expect(useBoardsStore.getState().boards[0].tasks[0]).toBe(task)
	expect(useBoardsStore.getState().activeId).toBe(10)
})

it('preserves a conflicting document draft and requires explicit resolution', async () => {
	useDocumentsStore.getState().editDraft(document.id, { content: 'Мой текст' })
	fetch.mockResolvedValueOnce(response({ code: 'revision_conflict' }, 409))
	await expect(useDocumentsStore.getState().saveDraft(document.id)).rejects.toMatchObject({ status: 409 })
	expect(readDraft(2, document.id).content).toBe('Мой текст')
	expect(useDocumentsStore.getState().conflicts[document.id]).toBe(true)
	await useDocumentsStore.getState().saveDraft(document.id)
	expect(fetch).toHaveBeenCalledTimes(1)
	fetch.mockResolvedValueOnce(response({ ...document, revision: 2, content: 'Серверный текст' }))
		.mockResolvedValueOnce(response({ ...document, revision: 3, content: 'Мой текст' }))
	await useDocumentsStore.getState().resolveConflict(document.id, true)
	expect(JSON.parse(fetch.mock.calls[2][1].body).expected_revision).toBe(2)
	expect(useDocumentsStore.getState().documents[0].content).toBe('Мой текст')
	expect(readDraft(2, document.id)).toBeNull()
})

it('preserves a draft during a remote update', async () => {
	useDocumentsStore.getState().editDraft(document.id, { content: 'Мой текст' })
	fetch.mockResolvedValueOnce(response({ ...document, revision: 2, content: 'Удалённая правка' }))
	await useDocumentsStore.getState().loadDocument(document.id)
	expect(useDocumentsStore.getState().drafts[document.id].content).toBe('Мой текст')
	expect(useDocumentsStore.getState().conflicts[document.id]).toBe(true)
})

it('requires an unchecked separate consent before registering', async () => {
	useAuthStore.setState({ user: null, authenticated: false, validated: true })
	fetch.mockImplementation(() => Promise.resolve(response({ code: 'unauthorized' }, 401)))
	usePrivacyStore.setState({ config: { consent_version: '2026-10-07' }, error: '' })
	render(<MemoryRouter initialEntries={['/login?mode=register']}><Login /></MemoryRouter>)
	const checkbox = await screen.findByRole('checkbox', { name: 'Я даю согласие на обработку персональных данных' })
	expect(checkbox).not.toBeChecked()
	expect(screen.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled()
	fireEvent.click(checkbox)
	expect(screen.getByRole('button', { name: 'Создать аккаунт' })).toBeEnabled()
})

it('keeps the task edit revision and draft when another participant updates it', async () => {
 useWorkspaceStore.setState({ workspaces: [{ id: 1, role: 'owner' }] })
 render(<MemoryRouter initialEntries={['/dashboard?task=task']}><Dashboard /></MemoryRouter>)
 fireEvent.click(screen.getByRole('heading', { name: 'Моя задача' }))
 const input = screen.getByDisplayValue('Моя задача')
 fireEvent.change(input, { target: { value: 'Мой черновик' } })
 useBoardsStore.setState(state => ({ boards: [{ ...state.boards[0], tasks: [{ ...task, title: 'Чужая правка', revision: 2 }] }] }))
 fetch.mockResolvedValueOnce(response({ code: 'revision_conflict' }, 409))
 fireEvent.blur(input)
 await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
 expect(JSON.parse(fetch.mock.calls[0][1].body).expected_revision).toBe(1)
 expect(await screen.findByRole('heading', { name: 'Мой черновик' })).toBeInTheDocument()
 expect(screen.getByRole('dialog')).toBeInTheDocument()
})
