import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const KEY = 'ethereal-notes:cookie-notice'
export default function CookieBanner() {
	const [visible, setVisible] = useState(() => localStorage.getItem(KEY) !== '2026-10-07')
	if (!visible) return null
	return <aside className="fixed bottom-4 left-4 z-[150] max-w-md rounded-xl border border-border bg-card p-4 text-sm shadow-lg" aria-label="Использование cookies">
		<p>Для входа используются необходимые cookies. Аналитика и рекламные cookies не применяются. <Link to="/privacy" className="text-primary underline">Подробнее</Link></p>
		<Button size="sm" className="mt-3" onClick={() => { localStorage.setItem(KEY, '2026-10-07'); setVisible(false) }}>Понятно</Button>
	</aside>
}
