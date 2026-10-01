import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { setToken } from '@/shared/api/client'
import { useAuthStore } from '@/shared/store/authStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { useDocumentsStore } from '@/shared/store/documentsStore'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { draftKey } from '@/shared/lib/documentDrafts'
import { document, deferred, response } from '@/test/fixtures'
import Documents from './documents'
import Dashboard from './dashboard'

vi.mock('@/pages/documents/ui/DocumentEditor', () => ({
	default: ({ content, editable, onChange }) => <textarea aria-label="Текст документа" value={content} readOnly={!editable} onChange={event => onChange(event.target.value)} />,
}))

beforeEach(() => {
	setToken(null)
	sessionStorage.clear()
	localStorage.setItem('ethereal-notes:auto-save', 'false')
	setToken('session')
	useAuthStore.setState({ token: 'session', user: { id: 1, login: 'owner' }, validated: true })
	useWorkspaceStore.setState({ activeId: 1, workspaces: [{ id: 1, role: 'owner' }], members: [{ user_id: 1, login: 'owner' }, { user_id: 2, login: 'member' }] })
	useDocumentsStore.setState({ documents: [document], activeId: document.id })
	vi.stubGlobal('fetch', vi.fn())
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => setToken(null))

it('recovers a local draft after remount without sending it when autosave is disabled', async () => {
	sessionStorage.setItem(draftKey(1, document.id), JSON.stringify({ title: 'Document', content: 'Recovered' }))
	const first = render(<Documents />)
	expect(screen.getByLabelText('Текст документа')).toHaveValue('Recovered')
	fireEvent.change(screen.getByLabelText('Текст документа'), { target: { value: 'Newest draft' } })
	first.unmount()
	useDocumentsStore.setState({ drafts: {} })
	render(<Documents />)
	expect(screen.getByLabelText('Текст документа')).toHaveValue('Newest draft')
	expect(fetch).not.toHaveBeenCalled()
	fetch.mockResolvedValueOnce(response({ ...document, content: 'Newest draft' }))
	await userEvent.click(screen.getByRole('button', { name: 'Сохранить версию' }))
	await waitFor(() => expect(sessionStorage.getItem(draftKey(1, document.id))).toBeNull())
})

it('does not replace editor text with an older successful save', async () => {
	const first = deferred()
	fetch.mockReturnValueOnce(first.promise)
	render(<Documents />)
	fireEvent.change(screen.getByLabelText('Текст документа'), { target: { value: 'First' } })
	await userEvent.click(screen.getByRole('button', { name: 'Сохранить версию' }))
	await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
	fireEvent.change(screen.getByLabelText('Текст документа'), { target: { value: 'Second' } })
	await act(async () => first.resolve(response({ ...document, content: 'First' })))
	expect(screen.getByLabelText('Текст документа')).toHaveValue('Second')
	expect(screen.getByRole('button', { name: 'Сохранить версию' })).toBeEnabled()
})

it('waits for restoration and keeps the draft visible after a failed response', async () => {
	const restored = deferred()
	const version = { id: 7, title: 'Document', content: 'Old version', author_login: 'owner', created_at: '2026-09-29T10:00:00' }
	useDocumentsStore.setState({ documents: [{ ...document, versions: [version] }] })
	fetch.mockReturnValueOnce(restored.promise)
	render(<Documents />)
	fireEvent.change(screen.getByLabelText('Текст документа'), { target: { value: 'Draft' } })
	await userEvent.click(screen.getByRole('button', { name: 'Откатить' }))
	const confirm = screen.getAllByRole('button', { name: 'Откатить' }).find(button => button.closest('[role="dialog"]'))
	await userEvent.click(confirm)
	await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
	expect(screen.getByLabelText('Текст документа')).toHaveValue('Draft')
	expect(confirm).toBeDisabled()
	await act(async () => restored.resolve(response({ detail: 'Restore failed' }, 500)))
	expect(screen.getByRole('dialog')).toBeInTheDocument()
	expect(screen.getByRole('alert')).toHaveTextContent('Restore failed')
	expect(screen.getByLabelText('Текст документа')).toHaveValue('Draft')
})

for (const view of ['self', 'all', '2']) {
	it(`deletes the last column including hidden tasks in view ${view}`, async () => {
		const tasks = [{ id: 'task-1', column_id: 'column', assignee_id: 2, author_id: 1, title: 'Task', tags: [], uid: '1001' }]
		const board = { id: 10, title: 'Board', columns: [{ id: 'column', title: 'Only column' }], tasks: view === 'self' ? [] : tasks }
		useBoardsStore.setState({ boards: [board], activeId: board.id, workspaceId: 1, view })
		fetch.mockResolvedValueOnce(response({ ...board, tasks }))
			.mockResolvedValueOnce(new Response(null, { status: 204 }))
			.mockResolvedValueOnce(response([{ ...board, columns: [], tasks: [] }]))
		render(<MemoryRouter><Dashboard /></MemoryRouter>)
		await userEvent.click(screen.getByRole('button', { name: 'Удалить колонку' }))
		await userEvent.click(await screen.findByRole('button', { name: 'Удалить колонку и задачи' }))
		await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
		expect(fetch.mock.calls[1][0]).toContain('delete_tasks=true')
		expect(fetch.mock.calls[1][1].method).toBe('DELETE')
	})
}

it('keeps the delete-column dialog open on a failed request', async () => {
	const board = { id: 10, title: 'Board', columns: [{ id: 'column', title: 'Empty' }], tasks: [] }
	useBoardsStore.setState({ boards: [board], activeId: board.id, workspaceId: 1 })
	fetch.mockResolvedValueOnce(response(board)).mockResolvedValueOnce(response({ detail: 'Delete failed' }, 500))
	render(<MemoryRouter><Dashboard /></MemoryRouter>)
	await userEvent.click(screen.getByRole('button', { name: 'Удалить колонку' }))
	await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить колонку', exact: true }))
	await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Delete failed'))
	expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('requires a destination and transfers tasks hidden by the active filter', async () => {
	const board = { id: 10, title: 'Board', columns: [{ id: 'source', title: 'Source' }, { id: 'target', title: 'Destination' }], tasks: [] }
	const task = { id: 'hidden', column_id: 'source', assignee_id: 2 }
	useBoardsStore.setState({ boards: [board], activeId: board.id, workspaceId: 1, view: 'self' })
	fetch.mockResolvedValueOnce(response({ ...board, tasks: [task] }))
		.mockResolvedValueOnce(new Response(null, { status: 204 }))
		.mockResolvedValueOnce(response([{ ...board, columns: [board.columns[1]] }]))
	render(<MemoryRouter><Dashboard /></MemoryRouter>)
	await userEvent.click(screen.getAllByRole('button', { name: 'Удалить колонку' })[0])
	const dialog = await screen.findByRole('dialog')
	const confirm = within(dialog).getByRole('button', { name: 'Удалить колонку', exact: true })
	expect(confirm).toBeDisabled()
	await userEvent.click(within(dialog).getByRole('button', { name: 'Колонка для переноса задач' }))
	await userEvent.click(await screen.findByRole('menuitem', { name: 'Destination' }))
	await userEvent.click(confirm)
	await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
	expect(fetch.mock.calls[1][0]).toContain('target_column_id=target')
	expect(fetch.mock.calls[1][0]).not.toContain('delete_tasks')
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
