import { Children, useLayoutEffect, useRef } from 'react'

const GAP = 16
const ROW_HEIGHT = 4

export default function KanbanLayout({ children }) {
	const grid = useRef(null)
	useLayoutEffect(() => {
		const elements = Array.from(grid.current.children)
		const pending = new Set()
		let frame = null
		function measure(element) {
			const height = element.firstElementChild.getBoundingClientRect().height
			const span = `span ${Math.max(1, Math.ceil((height + GAP) / ROW_HEIGHT))}`
			if (element.style.gridRowEnd !== span) element.style.gridRowEnd = span
		}
		elements.forEach(measure)
		const observer = new ResizeObserver(entries => {
			entries.forEach(entry => pending.add(entry.target.parentElement))
			if (frame !== null) return
			frame = requestAnimationFrame(() => {
				frame = null
				pending.forEach(measure)
				pending.clear()
			})
		})
		elements.forEach(element => observer.observe(element.firstElementChild))
		return () => {
			observer.disconnect()
			if (frame !== null) cancelAnimationFrame(frame)
		}
	}, [children])
	return <div ref={grid} className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] items-start gap-x-4 pb-4" style={{ gridAutoRows: ROW_HEIGHT }}>
		{Children.map(children, child => <div className="min-w-0 self-start">{child}</div>)}
	</div>
}
