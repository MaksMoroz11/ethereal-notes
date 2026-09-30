import { render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import DocumentEditor from './DocumentEditor'

it('does not turn programmatic content or editability changes into user edits', async () => {
	const onChange = vi.fn()
	const { container, rerender } = render(<DocumentEditor content="Original" editable onChange={onChange} />)
	await waitFor(() => expect(container.querySelector('.tiptap')).toHaveTextContent('Original'))
	rerender(<DocumentEditor content="Original" editable={false} onChange={onChange} />)
	await waitFor(() => expect(container.querySelector('.tiptap')).toHaveAttribute('contenteditable', 'false'))
	rerender(<DocumentEditor content="Restored" editable onChange={onChange} />)
	await waitFor(() => expect(container.querySelector('.tiptap')).toHaveTextContent('Restored'))
	expect(container.querySelector('.tiptap')).toHaveAttribute('contenteditable', 'true')
	expect(onChange).not.toHaveBeenCalled()
})
