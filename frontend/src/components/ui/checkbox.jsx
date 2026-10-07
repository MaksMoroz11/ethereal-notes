import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
	<span className={cn('relative inline-flex h-4 w-4 shrink-0', className)}>
		<input
			type="checkbox"
			className="peer h-4 w-4 shrink-0 appearance-none rounded-sm border border-muted-foreground bg-card checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
			ref={ref}
			{...props}
		/>
		<Check aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-4 w-4 text-primary-foreground peer-checked:block peer-disabled:opacity-50" />
	</span>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
