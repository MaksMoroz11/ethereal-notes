export function parseUtcDate(value) {
	if (!value) return null
	const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
	const date = new Date(timestamp)
	return Number.isNaN(date.getTime()) ? null : date
}

export function formatLocalDate(value, options) {
	const date = parseUtcDate(value)
	return date ? date.toLocaleString(undefined, options) : '—'
}

export function formatLocalDateOnly(value, options) {
	const date = parseUtcDate(value)
	return date ? date.toLocaleDateString(undefined, options) : '—'
}
