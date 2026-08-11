import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function CTA() {
	return (
		<section className="px-6 py-20 md:px-10">
			<div className="mx-auto max-w-3xl rounded-2xl border border-primary/25 bg-gradient-to-br from-accent to-card px-8 py-14 text-center">
				<h2 className="text-3xl font-bold text-foreground">Готовы навести порядок в проектах?</h2>
				<p className="mx-auto mt-3 max-w-xl text-muted-foreground">
					Создайте рабочее пространство за 2 минуты. Бесплатно для команд до 5 человек.
				</p>
				<Button asChild size="lg" className="mt-8">
					<Link to="/login">Создать аккаунт</Link>
				</Button>
			</div>
		</section>
	)
}
