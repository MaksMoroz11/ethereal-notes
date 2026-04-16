import React from 'react'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import Features from './components/Features/Features'
import Workflow from './components/Workflow/Workflow'
import Preview from './components/Preview/Preview'
import TechSpecs from './components/TechSpecs/TechSpecs'
import FAQ from './components/FAQ/FAQ'
import CTA from './components/CTA/CTA'
import Footer from './components/Footer/Footer'

function App() {
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
export default App