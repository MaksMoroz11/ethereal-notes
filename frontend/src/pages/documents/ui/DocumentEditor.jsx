import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function escapeHtml(text) {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function toEditorHtml(raw) {
	if (!raw) return ''
	if (/<[a-z][\s\S]*>/i.test(raw)) return raw
	return raw
		.split('\n')
		.map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
		.join('')
}

function ToolbarButton({ active, disabled, onClick, children, label }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={cn('h-8 w-8', active && 'bg-accent text-foreground')}
			disabled={disabled}
			onClick={onClick}
			aria-label={label}
			aria-pressed={active}
		>
			{children}
		</Button>
	)
}

export default function DocumentEditor({ content, editable, onChange }) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Placeholder.configure({ placeholder: 'Текст документа…' }),
		],
		content: toEditorHtml(content),
		editable,
		immediatelyRender: false,
		shouldRerenderOnTransaction: true,
		onUpdate: ({ editor: instance }) => {
			onChange?.(instance.getHTML())
		},
	})

	useEffect(() => {
		if (!editor) return
		editor.setEditable(editable)
	}, [editor, editable])

	if (!editor) return null

	return (
		<div
			className={cn(
				'flex min-h-105 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card',
				!editable && 'bg-muted/50'
			)}
		>
			<div className="flex flex-wrap gap-0.5 border-b border-border px-2 py-1.5">
				<ToolbarButton
					label="Жирный"
					active={editor.isActive('bold')}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBold().run()}
				>
					<Bold />
				</ToolbarButton>
				<ToolbarButton
					label="Курсив"
					active={editor.isActive('italic')}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleItalic().run()}
				>
					<Italic />
				</ToolbarButton>
				<ToolbarButton
					label="Заголовок 1"
					active={editor.isActive('heading', { level: 1 })}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				>
					<Heading1 />
				</ToolbarButton>
				<ToolbarButton
					label="Заголовок 2"
					active={editor.isActive('heading', { level: 2 })}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 />
				</ToolbarButton>
				<ToolbarButton
					label="Заголовок 3"
					active={editor.isActive('heading', { level: 3 })}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				>
					<Heading3 />
				</ToolbarButton>
				<ToolbarButton
					label="Маркированный список"
					active={editor.isActive('bulletList')}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List />
				</ToolbarButton>
				<ToolbarButton
					label="Нумерованный список"
					active={editor.isActive('orderedList')}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered />
				</ToolbarButton>
				<ToolbarButton
					label="Цитата"
					active={editor.isActive('blockquote')}
					disabled={!editable}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
				>
					<Quote />
				</ToolbarButton>
			</div>
			<EditorContent editor={editor} className="min-h-0 flex-1" />
		</div>
	)
}
