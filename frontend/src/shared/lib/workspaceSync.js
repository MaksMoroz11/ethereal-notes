import { useEffect } from 'react'
import { api, getSessionVersion } from '../api/client'
import { useWorkspaceStore, workspaceRequestIsCurrent } from '../store/workspaceStore'
import { useBoardsStore } from '../store/boardsStore'
import { useDocumentsStore } from '../store/documentsStore'
import { useFoldersStore } from '../store/foldersStore'
import { reconcile } from './reconcile'

export function useWorkspaceSync(workspaceId) {
	useEffect(() => {
		if (!workspaceId) return
		let timer, cancelled = false, running = false, delay = 10000
		const session = getSessionVersion()
		async function poll() {
			clearTimeout(timer)
			if (cancelled || running || document.hidden) return
			running = true
			try {
				const snapshot = await api(`/workspaces/${workspaceId}/sync`, { silent: true })
				if (cancelled || !workspaceRequestIsCurrent(workspaceId, session)) return
				const workspaceStore = useWorkspaceStore.getState()
				const oldRole = workspaceStore.workspaces.find(item => item.id === workspaceId)?.role
				const newRole = snapshot.workspaces.find(item => item.id === workspaceId)?.role
				useWorkspaceStore.setState(state => ({ members: reconcile(state.members, snapshot.members), workspaces: reconcile(state.workspaces, snapshot.workspaces), activityRevision: snapshot.activity_revision }))
				const view = useBoardsStore.getState().view
				const missingAssignee = !['self', 'all'].includes(view) && !snapshot.members.some(member => String(member.user_id) === String(view))
				if (oldRole !== newRole || missingAssignee) await useBoardsStore.getState().setView('self')
				const boardIds = new Set(snapshot.boards.map(item => item.id))
				useBoardsStore.setState(state => ({ boards: reconcile(state.boards, state.boards.filter(item => boardIds.has(item.id))), activeId: boardIds.has(state.activeId) ? state.activeId : snapshot.boards[0]?.id ?? null }))
				const documentIds = new Set(snapshot.documents.map(item => item.id))
				const removed = useDocumentsStore.getState().documents.filter(item => !documentIds.has(item.id)).map(item => item.id)
				if (removed.length) useDocumentsStore.getState().removeDocuments(new Set(removed))
				const folderIds = new Set(snapshot.folders.map(item => item.id))
				useFoldersStore.setState(state => ({ boardFolders: reconcile(state.boardFolders, state.boardFolders.filter(item => folderIds.has(item.id))), documentFolders: reconcile(state.documentFolders, state.documentFolders.filter(item => folderIds.has(item.id))) }))
				const jobs = []
				for (const item of snapshot.boards) {
					if (useBoardsStore.getState().boards.find(old => old.id === item.id)?.revision !== item.revision) jobs.push(useBoardsStore.getState().loadBoard(item.id))
				}
				for (const item of snapshot.documents) {
					if (useDocumentsStore.getState().documents.find(old => old.id === item.id)?.revision !== item.revision) jobs.push(useDocumentsStore.getState().loadDocument(item.id))
				}
				for (const item of snapshot.folders) {
					const state = useFoldersStore.getState()
					if ([...state.boardFolders, ...state.documentFolders].find(old => old.id === item.id)?.revision !== item.revision) jobs.push(state.loadFolder(item.id))
				}
				const results = await Promise.allSettled(jobs)
				if (results.some(result => result.status === 'rejected')) throw new Error('Не удалось обновить данные')
				delay = 10000
			} catch (error) {
				if (!cancelled && workspaceRequestIsCurrent(workspaceId, session) && [403, 404].includes(error.status)) await useWorkspaceStore.getState().loadWorkspaces().catch(() => {})
				delay = Math.min(delay * 2, 60000)
			} finally {
				running = false
				if (!cancelled && workspaceRequestIsCurrent(workspaceId, session) && !document.hidden) timer = setTimeout(poll, delay)
			}
		}
		const visible = () => { if (document.hidden) clearTimeout(timer); else poll() }
		timer = setTimeout(poll, 10000)
		document.addEventListener('visibilitychange', visible)
		return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visible) }
	}, [workspaceId])
}
