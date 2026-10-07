export function reconcile(previous, incoming) {
	const byId = new Map(previous.map(item => [item.id ?? item.user_id, item]))
	const result = incoming.map(item => {
		const old = byId.get(item.id ?? item.user_id)
		return old && JSON.stringify(old) === JSON.stringify(item) ? old : item
	})
	return result.length === previous.length && result.every((item, index) => item === previous[index]) ? previous : result
}

export function reconcileBoard(old, board) {
	if (!old) return board
	const next = { ...board, columns: reconcile(old.columns, board.columns), tasks: reconcile(old.tasks, board.tasks) }
	return JSON.stringify(old) === JSON.stringify(next) ? old : next
}
