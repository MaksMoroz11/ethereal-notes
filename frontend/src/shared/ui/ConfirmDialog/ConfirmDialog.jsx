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
}) {
	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next) onCancel?.()
			}}
		>
			<DialogContent showClose={false} className="border-l-4 border-l-destructive sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{text ? <DialogDescription>{text}</DialogDescription> : null}
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button type="button" variant="destructive" onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
