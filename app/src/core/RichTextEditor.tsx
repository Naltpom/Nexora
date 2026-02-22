import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { createMentionSuggestion, type MentionUser } from './MentionSuggestion'

interface Props {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  mentionUsers?: MentionUser[]
}

export default function RichTextEditor({ content, onChange, placeholder, mentionUsers }: Props) {
  const { t } = useTranslation('common')
  const resolvedPlaceholder = placeholder ?? t('rte_placeholder')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mentionUsersRef = useRef<MentionUser[]>(mentionUsers || [])

  useEffect(() => {
    mentionUsersRef.current = mentionUsers || []
  }, [mentionUsers])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: createMentionSuggestion(mentionUsersRef),
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content])

  const uploadImage = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await api.post('/uploads-rte/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (editor) {
        editor.chain().focus().setImage({ src: response.data.url }).run()
      }
    } catch (err) {
      console.error('Erreur upload image:', err)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file)
    e.target.value = ''
  }

  // Handle paste events for screenshots
  useEffect(() => {
    if (!editor) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) uploadImage(file)
          break
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('paste', handlePaste)
    return () => editorElement.removeEventListener('paste', handlePaste)
  }, [editor])

  if (!editor) return null

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
        >
          {'</>'}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          {t('rte_bullet_list')}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          {t('rte_ordered_list')}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
        >
          {t('rte_code_block')}
        </button>
        <button type="button" onClick={handleImageClick}>
          {t('rte_image')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={handleFileChange}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
