import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function ConfirmDialog({
	open = false,
	title,
	text,
	confirmLabel = 'Удалить',
	cancelLabel = 'Отмена',
	onConfirm,
	onCancel,
	busy = false,
	error = '',
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next && !busy) onCancel?.()
			}}
		>
			<DialogContent showClose={false} className="border-l-4 border-l-destructive sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{text ? <DialogDescription>{text}</DialogDescription> : null}
				</DialogHeader>
				{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
