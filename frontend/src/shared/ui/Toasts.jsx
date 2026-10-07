import { actionText } from '@/shared/messages/notifications'
import { X } from 'lucide-react'
import { useToastStore } from '@/shared/store/toastStore'
import { Button } from '@/components/ui/button'

export default function Toasts() {
	const items = useToastStore(state => state.items)
	const remove = useToastStore(state => state.remove)
	return <div className="fixed bottom-5 right-5 z-[200] flex max-w-sm flex-col gap-2" aria-live="polite">
		{items.map(item => <div key={item.id} role={item.type === 'error' ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-xl border bg-card p-4 text-sm shadow-lg ${item.type === 'error' ? 'border-destructive text-destructive' : 'border-primary/40 text-foreground'}`}>
			<span>{item.message}</span><Button variant="ghost" size="icon" aria-label={actionText.closeMessage} onClick={() => remove(item.id)}><X /></Button>
		</div>)}
	</div>
}
