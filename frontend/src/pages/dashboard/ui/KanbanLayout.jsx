import { Children, useLayoutEffect, useRef } from 'react'

const GAP = 16
const ROW_HEIGHT = 4

export default function KanbanLayout({ children }) {
	const grid = useRef(null)
	const positions = useRef(new Map())
	const animations = useRef(new Map())
	useLayoutEffect(() => {
		const elements = Array.from(grid.current.children)
		const pending = new Set()
		let frame = null
		function animateLayout() {
			const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
			const next = new Map()
			for (const element of elements) {
				const position = { left: element.offsetLeft, top: element.offsetTop }
				const previous = positions.current.get(element.dataset.layoutKey)
				next.set(element.dataset.layoutKey, position)
				if (!previous || reducedMotion || !element.animate) continue
				const x = previous.left - position.left, y = previous.top - position.top
				if (Math.abs(x) < 1 && Math.abs(y) < 1) continue
				animations.current.get(element)?.cancel()
				animations.current.set(element, element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration: 240, easing: 'ease-out' }))
			}
			positions.current = next
			for (const [element, animation] of animations.current) {
				if (!element.isConnected) { animation.cancel(); animations.current.delete(element) }
			}
		}
		function measure(element) {
			const height = element.firstElementChild.getBoundingClientRect().height
			const span = `span ${Math.max(1, Math.ceil((height + GAP) / ROW_HEIGHT))}`
			if (element.style.gridRowEnd !== span) element.style.gridRowEnd = span
		}
		elements.forEach(measure)
		animateLayout()
		const observer = new ResizeObserver(entries => {
			entries.forEach(entry => pending.add(entry.target.parentElement))
			if (frame !== null) return
			frame = requestAnimationFrame(() => {
				frame = null
				pending.forEach(measure)
				pending.clear()
				animateLayout()
			})
		})
		elements.forEach(element => observer.observe(element.firstElementChild))
		return () => {
			observer.disconnect()
			if (frame !== null) cancelAnimationFrame(frame)
		}
	}, [children])
	return <div ref={grid} className="relative grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] items-start gap-x-4 pb-4" style={{ gridAutoRows: ROW_HEIGHT }}>
		{Children.map(children, (child, index) => <div data-layout-key={child?.key ?? index} className="min-w-0 self-start">{child}</div>)}
	</div>
}
