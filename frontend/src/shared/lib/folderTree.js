export function folderSubtree(folders, rootId) {
	const ids = new Set([rootId])
	let changed = true
	while (changed) {
		changed = false
		for (const folder of folders) {
			if (ids.has(folder.parent_id) && !ids.has(folder.id)) {
				ids.add(folder.id)
				changed = true
			}
		}
	}
	return ids
}
