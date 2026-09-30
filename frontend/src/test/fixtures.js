export function deferred() {
	let resolve, reject
	const promise = new Promise((yes, no) => { resolve = yes; reject = no })
	return { promise, resolve, reject }
}
export const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
export const document = { id: 'doc-1', title: 'Document', content: 'Original', folder_id: null, versions: [], author_login: 'owner', updated_by: 'owner', created_at: '2026-09-30T10:00:00', updated_at: '2026-09-30T10:00:00' }
