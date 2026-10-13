import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { setSession } from '@/shared/api/client'
import { useAuthStore } from '@/shared/store/authStore'
import { useBoardsStore } from '@/shared/store/boardsStore'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'
import { deferred, dragTransfer, response } from '@/test/fixtures'
import Dashboard from './index'

const own = { id: 'own', title: 'Своя задача', uid: '1', column_id: 'plan', assignee_id: 1, author_id: 1, revision: 5, tags: [] }
const other = { ...own, id: 'other', title: 'Чужая задача', uid: '2', assignee_id: 2 }
const columns = [{ id: 'plan', title: 'План', position: 0 }, { id: 'done', title: 'Готово', position: 1 }]

beforeEach(() => {
	setSession(null)
	useAuthStore.setState({ user: { id: 1, login: 'member' }, authenticated: true, validated: true })
	setSession(1)
	useWorkspaceStore.setState({ activeId: 1, workspaces: [{ id: 1, role: 'member' }], members: [] })
	useBoardsStore.setState({ activeId: 10, workspaceId: 1, view: 'self', loading: false, error: '', moving: {}, boards: [{ id: 10, title: 'Доска', columns, tasks: [own, other] }] })
	vi.stubGlobal('fetch', vi.fn())
	vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => setSession(null))

function setup() {
	const { container } = render(<MemoryRouter><Dashboard /></MemoryRouter>)
	return { card: id => container.querySelector(`[data-task-id="${id}"]`), column: id => container.querySelector(`[data-column-id="${id}"]`) }
}
function drop(card, column) {
	const dataTransfer = dragTransfer()
	fireEvent.dragStart(card, { dataTransfer })
	fireEvent.dragOver(column, { dataTransfer })
	fireEvent.drop(column, { dataTransfer })
}

it('moves a member task through the revision-checked endpoint and prevents duplicate drops', async () => {
	const pending = deferred()
	fetch.mockReturnValueOnce(pending.promise)
	const ui = setup()
	drop(ui.card('own'), ui.column('done'))
	expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ column_id: 'done', expected_revision: 5 })
	expect(fetch.mock.calls[0][0]).toContain('/tasks/own/move')
	expect(ui.card('own').draggable).toBe(false)
	drop(ui.card('own'), ui.column('done'))
	expect(fetch).toHaveBeenCalledTimes(1)
	await act(async () => pending.resolve(response({ ...own, column_id: 'done', revision: 6 })))
	expect(ui.column('done').contains(ui.card('own'))).toBe(true)
	expect(useBoardsStore.getState().boards[0].tasks[1]).toBe(other)
	expect(ui.card('own').draggable).toBe(true)
})

it('highlights an empty destination and clears it after cancelling the drag', () => {
	const ui = setup(), dataTransfer = dragTransfer()
	fireEvent.dragStart(ui.card('own'), { dataTransfer })
	fireEvent.dragOver(ui.column('done'), { dataTransfer })
	expect(screen.getByText('Отпустите, чтобы переместить')).toBeInTheDocument()
	fireEvent.dragEnd(ui.card('own'), { dataTransfer })
	expect(screen.queryByText('Отпустите, чтобы переместить')).not.toBeInTheDocument()
	fireEvent.drop(ui.column('done'), { dataTransfer })
	expect(fetch).not.toHaveBeenCalled()
})

it('does not allow a member to drag another user task or accept an external payload', () => {
	const ui = setup()
	expect(ui.card('other').draggable).toBe(false)
	drop(ui.card('other'), ui.column('done'))
	const dataTransfer = dragTransfer()
	dataTransfer.setData('application/x-ethereal-task', 'own')
	fireEvent.drop(ui.column('done'), { dataTransfer })
	expect(fetch).not.toHaveBeenCalled()
})

for (const role of ['owner', 'admin']) {
	it(`allows ${role} to move another user task`, async () => {
		useWorkspaceStore.setState({ workspaces: [{ id: 1, role }] })
		fetch.mockResolvedValueOnce(response({ ...other, column_id: 'done', revision: 6 }))
		const ui = setup()
		drop(ui.card('other'), ui.column('done'))
		await waitFor(() => expect(ui.column('done').contains(ui.card('other'))).toBe(true))
	})
}

it('keeps the task in its original column after a failed request', async () => {
	fetch.mockResolvedValueOnce(response({ detail: 'Перемещение отклонено' }, 409))
	const ui = setup()
	drop(ui.card('own'), ui.column('done'))
	expect(await screen.findByText('Перемещение отклонено')).toBeInTheDocument()
	expect(ui.column('plan').contains(ui.card('own'))).toBe(true)
	expect(ui.card('own').draggable).toBe(true)
	expect(useBoardsStore.getState().boards[0].tasks[0]).toBe(own)
})

it('does not send a move to the same column or after changing the task filter', () => {
	const ui = setup()
	drop(ui.card('own'), ui.column('plan'))
	const dataTransfer = dragTransfer()
	fireEvent.dragStart(ui.card('own'), { dataTransfer })
	act(() => useBoardsStore.setState({ view: 'all' }))
	fireEvent.drop(ui.column('done'), { dataTransfer })
	expect(fetch).not.toHaveBeenCalled()
})

it('does not begin a drag from the task menu button', () => {
	const ui = setup()
	drop(ui.card('own').querySelector('button'), ui.column('done'))
	expect(fetch).not.toHaveBeenCalled()
})

it('retains the column title on failure and adds the new column without remounting existing columns', async () => {
	useWorkspaceStore.setState({ workspaces: [{ id: 1, role: 'owner' }] })
	const pending = deferred()
	fetch.mockReturnValueOnce(pending.promise)
	const ui = setup(), oldColumn = ui.column('plan')
	const title = screen.getByPlaceholderText('Новая колонка')
	fireEvent.change(title, { target: { value: 'Проверка' } })
	fireEvent.submit(title.closest('form'))
	fireEvent.submit(title.closest('form'))
	expect(fetch).toHaveBeenCalledTimes(1)
	expect(screen.getByRole('button', { name: 'Добавление…' })).toBeDisabled()
	await act(async () => pending.resolve(response({ detail: 'Ошибка создания' }, 500)))
	expect(title).toHaveValue('Проверка')
	expect(title).toBeEnabled()
	fetch.mockResolvedValueOnce(response({ id: 'review', title: 'Проверка', position: 2 }))
	fireEvent.submit(title.closest('form'))
	await waitFor(() => expect(ui.column('review')).not.toBeNull())
	expect(ui.column('plan')).toBe(oldColumn)
	expect(title).toHaveValue('')
	expect(fetch.mock.calls.every(call => call[1].method === 'POST')).toBe(true)
})

it('keeps an open task draft while a new column appears in the board', () => {
	useWorkspaceStore.setState({ workspaces: [{ id: 1, role: 'owner' }] })
	render(<MemoryRouter initialEntries={['/dashboard?task=own']}><Dashboard /></MemoryRouter>)
	fireEvent.click(screen.getByRole('heading', { name: 'Своя задача' }))
	const input = screen.getByDisplayValue('Своя задача')
	fireEvent.change(input, { target: { value: 'Мой черновик' } })
	act(() => useBoardsStore.setState(state => ({ boards: [{ ...state.boards[0], columns: [...columns, { id: 'review', title: 'Проверка', position: 2 }] }] })))
	expect(screen.getByRole('dialog')).toBeInTheDocument()
	expect(input).toHaveValue('Мой черновик')
	expect(fetch).not.toHaveBeenCalled()
})
