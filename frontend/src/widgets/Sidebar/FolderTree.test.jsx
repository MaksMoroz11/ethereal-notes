import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FolderTree from './FolderTree'
import { useFoldersStore } from '@/shared/store/foldersStore'
import { deferred } from '@/test/fixtures'

const folders = [{ id: 'root', title: 'Legacy', parent_id: null }, { id: 'child', title: 'Nested', parent_id: 'root' }]
const props = { folders, items: [{ id: 'doc', title: 'Old documentation', folder_id: 'child' }], isDocs: true, isManager: true, onSelect: vi.fn() }

beforeEach(() => { useFoldersStore.setState({ deleteFolder: vi.fn() }) })

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
