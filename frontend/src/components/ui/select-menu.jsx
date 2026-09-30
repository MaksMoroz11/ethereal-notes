import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function SelectMenu({ value, options, onValueChange, ariaLabel, className, contentClassName }) {
	const selected = options.find(option => String(option.value) === String(value))

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" aria-label={ariaLabel} className={cn('h-9 justify-between gap-2 font-normal', className)}>
					<span className="min-w-0 truncate">{selected?.label ?? options[0]?.label}</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className={cn('max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto', contentClassName)}>
				{options.map(option => (
					<DropdownMenuItem key={String(option.value)} disabled={option.disabled} onSelect={() => onValueChange(option.value)}>
						<span className="min-w-0 truncate">{option.label}</span>
						{String(option.value) === String(value) ? <Check className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
