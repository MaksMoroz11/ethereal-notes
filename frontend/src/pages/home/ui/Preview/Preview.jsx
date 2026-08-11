export default function Preview() {
	return (
		<section className="px-6 py-20 md:px-10">
			<div className="mx-auto max-w-6xl">
				<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<div className="h-3 w-28 rounded bg-muted" />
						<div className="flex items-center gap-2">
							<div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
							<div className="h-5 w-16 rounded-full bg-muted" />
						</div>
					</div>
					<div className="flex min-h-72">
						<div className="flex w-40 flex-col gap-2 border-r border-border bg-sidebar p-3">
							<div className="h-8 rounded-md bg-muted" />
							<div className="h-8 rounded-md bg-muted" />
							<div className="h-8 rounded-md bg-accent" />
						</div>
						<div className="flex-1 p-4">
							<div className="mb-4 flex items-center justify-between">
								<div className="h-4 w-40 rounded bg-muted" />
								<div className="h-8 w-24 rounded-md bg-primary/30" />
							</div>
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								{[2, 1, 2, 1].map((count, i) => (
									<div key={i} className="space-y-2 rounded-lg bg-muted p-2">
										{Array.from({ length: count }).map((_, j) => (
											<div key={j} className="h-14 rounded-md border border-border bg-card" />
										))}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
