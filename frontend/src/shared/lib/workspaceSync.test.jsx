import { act, render, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { useWorkspaceSync } from './workspaceSync'
import { setSession } from '../api/client'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useBoardsStore } from '../store/boardsStore'
import { useDocumentsStore } from '../store/documentsStore'
import { useFoldersStore } from '../store/foldersStore'
import { response, deferred } from '@/test/fixtures'

function Sync({ id = 1 }) { useWorkspaceSync(id); return null }
let board, snapshot
beforeEach(() => {
	vi.useFakeTimers()
	vi.stubGlobal('fetch', vi.fn())
	Object.defineProperty(document, 'hidden', { value: false, configurable: true })
	setSession(2)
	useWorkspaceStore.setState({ activeId: 1, workspaces: [{ id: 1, role: 'member' }], members: [] })
	board = { id: 10, revision: 1, title: 'Доска', tasks: [], columns: [] }
	useBoardsStore.setState({ workspaceId: 1, boards: [board], activeId: 10 })
	useDocumentsStore.setState({ documents: [] })
	useFoldersStore.setState({ boardFolders: [], documentFolders: [] })
	snapshot = { boards: [{ id: 10, revision: 1 }], documents: [], folders: [], members: [], workspaces: [{ id: 1, role: 'member' }], activity_revision: 1 }
})
afterEach(() => { cleanup(); setSession(null); vi.useRealTimers(); vi.unstubAllGlobals() })

it('polls every ten seconds and retains unchanged array and board identities', async () => {
	fetch.mockImplementation(() => Promise.resolve(response(snapshot)))
	const original = useBoardsStore.getState().boards
	render(<Sync />)
	await act(() => vi.advanceTimersByTimeAsync(10000))
	expect(fetch).toHaveBeenCalledTimes(1)
	expect(useBoardsStore.getState().boards).toBe(original)
	await act(() => vi.advanceTimersByTimeAsync(10000))
	expect(fetch).toHaveBeenCalledTimes(2)
})

it('loads just the board with a changed revision without entering the loading state', async () => {
	fetch.mockResolvedValueOnce(response({ ...snapshot, boards: [{ id: 10, revision: 2 }] }))
	fetch.mockResolvedValueOnce(response({ ...board, revision: 2, title: 'Новая доска' }))
	render(<Sync />)
	await act(() => vi.advanceTimersByTimeAsync(10000))
	expect(fetch.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining([expect.stringContaining('/workspaces/1/sync'), expect.stringContaining('/boards/10')]))
	expect(fetch).toHaveBeenCalledTimes(2)
	expect(useBoardsStore.getState().boards[0].title).toBe('Новая доска')
	expect(useBoardsStore.getState().loading).toBe(false)
})

it('pauses a hidden tab and immediately checks changes on return', async () => {
	fetch.mockImplementation(() => Promise.resolve(response(snapshot)))
	render(<Sync />)
	Object.defineProperty(document, 'hidden', { value: true, configurable: true })
	act(() => document.dispatchEvent(new Event('visibilitychange')))
	await act(() => vi.advanceTimersByTimeAsync(30000))
	expect(fetch).not.toHaveBeenCalled()
	Object.defineProperty(document, 'hidden', { value: false, configurable: true })
	await act(async () => document.dispatchEvent(new Event('visibilitychange')))
	expect(fetch).toHaveBeenCalledTimes(1)
})

it('backs off after failure and ignores a response from the previous workspace', async () => {
	fetch.mockRejectedValueOnce(new Error('offline'))
	const pending = deferred()
	fetch.mockReturnValueOnce(pending.promise)
	render(<Sync />)
	await act(() => vi.advanceTimersByTimeAsync(10000))
	await act(() => vi.advanceTimersByTimeAsync(19999))
	expect(fetch).toHaveBeenCalledTimes(1)
	await act(() => vi.advanceTimersByTimeAsync(1))
	expect(fetch).toHaveBeenCalledTimes(2)
	useWorkspaceStore.setState({ activeId: 2 })
	await act(async () => pending.resolve(response({ ...snapshot, members: [{ user_id: 9, login: 'stale' }] })))
	expect(useWorkspaceStore.getState().members).toEqual([])
})
