import { act, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import KanbanLayout from './KanbanLayout'

it('measures individual columns and updates their spans after content or width changes', () => {
	let notify
	let measure
	vi.stubGlobal('requestAnimationFrame', callback => { measure = callback; return 1 })
	const cancelFrame = vi.fn()
	vi.stubGlobal('cancelAnimationFrame', cancelFrame)
	const disconnect = vi.fn()
	vi.stubGlobal('ResizeObserver', class {
		constructor(callback) { notify = callback }
		observe() {}
		disconnect = disconnect
	})
	const { container, unmount } = render(<KanbanLayout><div>Empty</div><div>Many tasks</div></KanbanLayout>)
	const [short, tall] = container.firstChild.children
	short.firstChild.getBoundingClientRect = () => ({ height: 120 })
	tall.firstChild.getBoundingClientRect = () => ({ height: 460 })
	act(() => notify([{ target: short.firstChild }, { target: tall.firstChild }]))
	act(() => measure())
	expect(short.style.gridRowEnd).toBe('span 34')
	expect(tall.style.gridRowEnd).toBe('span 119')
	tall.firstChild.getBoundingClientRect = () => ({ height: 630 })
	act(() => notify([{ target: tall.firstChild }]))
	act(() => measure())
	expect(tall.style.gridRowEnd).toBe('span 162')
	act(() => notify([{ target: short.firstChild }]))
	unmount()
	expect(disconnect).toHaveBeenCalled()
	expect(cancelFrame).toHaveBeenCalledWith(1)
})

for (const reducedMotion of [false, true]) {
	it(`animates changed column positions only when reduced motion is ${reducedMotion}`, () => {
		let notify, frame
		vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }))
		vi.stubGlobal('requestAnimationFrame', callback => { frame = callback; return 1 })
		vi.stubGlobal('ResizeObserver', class { constructor(callback) { notify = callback } observe() {} disconnect() {} })
		const { container } = render(<KanbanLayout><div key="first">First</div><div key="second">Second</div></KanbanLayout>)
		const wrapper = container.firstChild.children[1]
		wrapper.animate = vi.fn(() => ({ cancel: vi.fn() }))
		Object.defineProperty(wrapper, 'offsetLeft', { configurable: true, value: 300 })
		act(() => notify([{ target: wrapper.firstChild }]))
		act(() => frame())
		if (reducedMotion) expect(wrapper.animate).not.toHaveBeenCalled()
		else expect(wrapper.animate).toHaveBeenCalledWith([{ transform: 'translate(-300px, 0px)' }, { transform: 'translate(0, 0)' }], { duration: 240, easing: 'ease-out' })
	})
}
