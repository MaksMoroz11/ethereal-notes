const PREFIX = 'ethereal-notes:draft:'
export const draftKey = (userId, documentId) => `${PREFIX}${userId}:${documentId}`

export function readDraft(userId, documentId) {
	try {
		const value = JSON.parse(sessionStorage.getItem(draftKey(userId, documentId)))
		if (typeof value?.title === 'string' && typeof value?.content === 'string') return value
	} catch { /* A damaged draft must not prevent opening the document. */ }
	return null
}
export function writeDraft(userId, documentId, draft) {
	try { sessionStorage.setItem(draftKey(userId, documentId), JSON.stringify(draft)); return true }
	catch { return false }
}
export function removeDraft(userId, documentId) {
	sessionStorage.removeItem(draftKey(userId, documentId))
}
export function clearDrafts() {
	for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
		const key = sessionStorage.key(index)
		if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key)
	}
}
export function snapshotOf(draft) {
	const html = draft.content || ''
	const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
	return { title: draft.title.trim() || 'Без названия', content: text ? html : '' }
}
export const sameSnapshot = (a, b) => a.title === b.title && a.content === b.content
