import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from './ui/Hero/Hero'
import Features from './ui/Features/Features'
import Workflow from './ui/Workflow/Workflow'
import Preview from './ui/Preview/Preview'
import TechSpecs from './ui/TechSpecs/TechSpecs'
import FAQ from './ui/FAQ/FAQ'
import CTA from './ui/CTA/CTA'

export default function Home() {
	const location = useLocation()

	useEffect(() => {
		if (!location.hash) return undefined
		const frame = requestAnimationFrame(() => {
			document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
		return () => cancelAnimationFrame(frame)
	}, [location.hash])

	return (
		<>
			<Hero />
			<Features />
			<Workflow />
			<Preview />
			<TechSpecs />
			<FAQ />
			<CTA />
		</>
	)
}
