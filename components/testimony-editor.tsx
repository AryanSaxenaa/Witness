'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

interface TestimonyEditorProps {
  onChange: (text: string) => void
  placeholder?: string
  initialContent?: string
}

export function TestimonyEditor({ onChange, placeholder, initialContent }: TestimonyEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] outline-none text-sm leading-relaxed text-white/90 font-sans',
        'aria-label': 'Testimony text input',
      },
    },
    onUpdate({ editor: updatedEditor }: { editor: Editor }) {
      onChange(updatedEditor.getText())
    },
  })

  useEffect(() => {
    if (editor && initialContent && editor.getText() !== initialContent) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  return (
    <div className="border border-witness-border bg-white/[0.02] p-4 focus-within:border-witness-red transition-colors">
      <div className="text-xs text-witness-grey uppercase tracking-widest mb-3 pb-2 border-b border-witness-border">
        TEXT TESTIMONY INPUT
      </div>
      <EditorContent editor={editor} />
      {!editor?.getText() && (
        <div className="text-sm text-witness-grey/50 -mt-[200px] pointer-events-none pl-0.5">
          {placeholder ?? 'Paste or type testimony text here...'}
        </div>
      )}
    </div>
  )
}
