import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FolderTree from './FolderTree'
import { useFoldersStore } from '@/shared/store/foldersStore'
import { deferred, dragTransfer } from '@/test/fixtures'
import { useWorkspaceStore } from '@/shared/store/workspaceStore'

const folders = [{ id: 'root', title: 'Legacy', parent_id: null }, { id: 'child', title: 'Nested', parent_id: 'root' }]
const props = { folders, items: [{ id: 'doc', title: 'Old documentation', folder_id: 'child' }], isDocs: true, isManager: true, onSelect: vi.fn() }

beforeEach(() => { useFoldersStore.setState({ deleteFolder: vi.fn(), updateFolder: vi.fn().mockResolvedValue(undefined) }) })

it('opens actions below the trigger and asks before recursively deleting a nonempty folder', async () => {
	const deletion = deferred()
	const deleteFolder = useFoldersStore.getState().deleteFolder.mockReturnValue(deletion.promise)
	render(<FolderTree {...props} />)
	await userEvent.click(screen.getByRole('button', { name: 'Действия папки: Legacy' }))
	expect(await screen.findByRole('menu')).toHaveAttribute('data-side', 'bottom')
	await userEvent.click(screen.getByRole('menuitem', { name: 'Удалить папку' }))
	const dialog = await screen.findByRole('dialog')
	expect(dialog).toHaveTextContent('Подпапок: 1. Документов: 1.')
	expect(deleteFolder).not.toHaveBeenCalled()
	await userEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }))
	expect(deleteFolder).not.toHaveBeenCalled()
	await userEvent.click(screen.getByRole('button', { name: 'Действия папки: Legacy' }))
	await userEvent.click(screen.getByRole('menuitem', { name: 'Удалить папку' }))
	const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Удалить папку и содержимое' })
	await userEvent.click(confirm)
	expect(deleteFolder).toHaveBeenCalledWith('root', true)
	expect(confirm).toBeDisabled()
	await act(async () => deletion.reject(new Error('Deletion failed')))
	expect(screen.getByRole('alert')).toHaveTextContent('Deletion failed')
	expect(confirm).toBeEnabled()
	deleteFolder.mockResolvedValueOnce(undefined)
	await userEvent.click(confirm)
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('keeps document actions below the trigger as well', async () => {
	render(<FolderTree {...props} />)
	await userEvent.click(screen.getByRole('button', { name: 'Действия: Old documentation' }))
	expect(await screen.findByRole('menu')).toHaveAttribute('data-side', 'bottom')
})

function dragInto(source, target) {
	const dataTransfer = dragTransfer()
	fireEvent.dragStart(source, { dataTransfer })
	fireEvent.dragOver(target, { dataTransfer })
	fireEvent.drop(target, { dataTransfer })
}

it('moves a document into the folder containing the target row and reveals a closed folder on hover', async () => {
	const onMoveItem = vi.fn().mockResolvedValue(undefined)
	render(<FolderTree {...props} items={[...props.items, { id: 'source', title: 'Новый документ', folder_id: null }]} onMoveItem={onMoveItem} />)
	fireEvent.click(screen.getByRole('button', { name: 'Nested', exact: true }))
	expect(screen.queryByText('Old documentation')).not.toBeInTheDocument()
	vi.useFakeTimers()
	const dataTransfer = dragTransfer()
	fireEvent.dragStart(screen.getByRole('listitem', { name: 'Документ: Новый документ' }), { dataTransfer })
	fireEvent.dragOver(screen.getByRole('listitem', { name: 'Папка: Nested' }), { dataTransfer })
	act(() => vi.advanceTimersByTime(600))
	expect(screen.getByText('Old documentation')).toBeInTheDocument()
	fireEvent.drop(screen.getByRole('listitem', { name: 'Документ: Old documentation' }), { dataTransfer })
	await act(async () => {})
	expect(onMoveItem).toHaveBeenCalledWith('source', 'child')
})

for (const isDocs of [true, false]) {
	it(`moves a ${isDocs ? 'document' : 'board'} from a folder into the root`, async () => {
		const onMoveItem = vi.fn().mockResolvedValue(undefined)
		render(<FolderTree {...props} isDocs={isDocs} onMoveItem={onMoveItem} />)
		const dataTransfer = dragTransfer()
		fireEvent.dragStart(screen.getByRole('listitem', { name: `${isDocs ? 'Документ' : 'Доска'}: Old documentation` }), { dataTransfer })
		fireEvent.drop(screen.getByText('Переместить в корень'), { dataTransfer })
		await waitFor(() => expect(onMoveItem).toHaveBeenCalledWith('doc', null))
	})
}

it('moves a complete folder to another folder', async () => {
	render(<FolderTree {...props} folders={[...folders, { id: 'destination', title: 'Новая папка', parent_id: null }]} />)
	dragInto(screen.getByRole('listitem', { name: 'Папка: Legacy' }), screen.getByRole('listitem', { name: 'Папка: Новая папка' }))
	await waitFor(() => expect(useFoldersStore.getState().updateFolder).toHaveBeenCalledWith('root', { parent_id: 'destination' }))
})

it('rejects a folder drop onto itself, its descendant, and the current parent', () => {
	render(<FolderTree {...props} />)
	const parent = screen.getByRole('listitem', { name: 'Папка: Legacy' })
	const child = screen.getByRole('listitem', { name: 'Папка: Nested' })
	dragInto(parent, parent)
	dragInto(parent, child)
	dragInto(child, parent)
	expect(useFoldersStore.getState().updateFolder).not.toHaveBeenCalled()
})

it('does not accept a foreign transfer or let a member drag hierarchy items', () => {
	const onMoveItem = vi.fn()
	render(<FolderTree {...props} isManager={false} onMoveItem={onMoveItem} />)
	const item = screen.getByRole('listitem', { name: 'Документ: Old documentation' })
	expect(item.draggable).toBe(false)
	dragInto(item, screen.getByRole('listitem', { name: 'Папка: Legacy' }))
	const dataTransfer = dragTransfer()
	dataTransfer.setData('application/x-ethereal-folder-item', JSON.stringify({ type: 'item', id: 'doc' }))
	fireEvent.drop(screen.getByRole('list', { name: 'Иерархия' }), { dataTransfer })
	expect(onMoveItem).not.toHaveBeenCalled()
})

it('blocks another drag during a pending move and preserves the original item on failure', async () => {
	const pending = deferred(), onMoveItem = vi.fn().mockReturnValue(pending.promise)
	render(<FolderTree {...props} onMoveItem={onMoveItem} />)
	const source = screen.getByRole('listitem', { name: 'Документ: Old documentation' })
	const destination = screen.getByRole('listitem', { name: 'Папка: Legacy' })
	dragInto(source, destination)
	expect(screen.getByRole('status')).toHaveTextContent('Перемещение…')
	expect(source.draggable).toBe(false)
	dragInto(source, destination)
	expect(onMoveItem).toHaveBeenCalledTimes(1)
	await act(async () => pending.reject(new Error('Перенос не выполнен')))
	expect(screen.getByRole('alert')).toHaveTextContent('Перенос не выполнен')
	expect(screen.getByRole('listitem', { name: 'Папка: Nested' }).contains(source)).toBe(true)
	expect(source.draggable).toBe(true)
})

it('rejects a drag started in a different workspace', () => {
	const onMoveItem = vi.fn()
	const previous = useWorkspaceStore.getState().activeId
	render(<FolderTree {...props} onMoveItem={onMoveItem} />)
	const dataTransfer = dragTransfer()
	fireEvent.dragStart(screen.getByRole('listitem', { name: 'Документ: Old documentation' }), { dataTransfer })
	act(() => useWorkspaceStore.setState({ activeId: 'different' }))
	fireEvent.drop(screen.getByRole('listitem', { name: 'Папка: Legacy' }), { dataTransfer })
	expect(onMoveItem).not.toHaveBeenCalled()
	act(() => useWorkspaceStore.setState({ activeId: previous }))
})
