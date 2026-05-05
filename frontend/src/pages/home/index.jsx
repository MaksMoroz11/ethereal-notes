import React from 'react'
import Header from '../../widgets/Header/Header'
import Footer from '../../widgets/Footer/Footer'
import Hero from './ui/Hero/Hero'
import Features from './ui/Features/Features'
import Workflow from './ui/Workflow/Workflow'
import Preview from './ui/Preview/Preview'
import TechSpecs from './ui/TechSpecs/TechSpecs'
import FAQ from './ui/FAQ/FAQ'
import CTA from './ui/CTA/CTA'

export default function Home() {
	return (
		<div className="app">
			<Header />
			<main>
				<Hero />
				<Features />
				<Workflow />
				<Preview />
				<TechSpecs />
				<FAQ />
				<CTA />
			</main>
			<Footer />
		</div>
	)
}
