import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface MentionUser {
  id: number
  first_name: string
  last_name: string
  email: string
}

interface MentionListProps {
  items: MentionUser[]
  command: (item: { id: string; label: string }) => void
}

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) {
        command({ id: String(item.id), label: `${item.first_name} ${item.last_name}` })
      }
    },
    [items, command],
  )

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return <div className="mention-suggestion-empty">Aucun utilisateur trouve</div>
  }

  return (
    <>
      {items.map((item, index) => (
        <button
          key={item.id}
          className={`mention-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
          onClick={() => selectItem(index)}
          type="button"
        >
          <span className="mention-name">
            {item.first_name} {item.last_name}
          </span>
          <span className="mention-email">{item.email}</span>
        </button>
      ))}
    </>
  )
})

export function createMentionSuggestion(usersRef: RefObject<MentionUser[]>) {
  return {
    items: ({ query }: { query: string }) => {
      const users = usersRef.current || []
      if (!query) return users.slice(0, 8)
      const q = query.toLowerCase()
      return users
        .filter(
          (u) =>
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
        .slice(0, 8)
    },

    render: () => {
      let popup: HTMLDivElement | null = null
      let root: Root | null = null
      let componentRef: MentionListRef | null = null

      return {
        onStart: (props: SuggestionProps) => {
          popup = document.createElement('div')
          popup.className = 'mention-suggestion'
          document.body.appendChild(popup)
          root = createRoot(popup)

          const rect = props.clientRect?.()
          if (rect && popup) {
            popup.style.top = `${rect.bottom + 4}px`
            popup.style.left = `${rect.left}px`
          }

          root.render(
            <MentionList
              ref={(ref) => { componentRef = ref }}
              items={props.items as MentionUser[]}
              command={props.command}
            />,
          )
        },

        onUpdate: (props: SuggestionProps) => {
          if (!root || !popup) return

          const rect = props.clientRect?.()
          if (rect) {
            popup.style.top = `${rect.bottom + 4}px`
            popup.style.left = `${rect.left}px`
          }

          root.render(
            <MentionList
              ref={(ref) => { componentRef = ref }}
              items={props.items as MentionUser[]}
              command={props.command}
            />,
          )
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === 'Escape') {
            popup?.remove()
            popup = null
            root?.unmount()
            root = null
            return true
          }
          return componentRef?.onKeyDown(props) ?? false
        },

        onExit: () => {
          popup?.remove()
          popup = null
          root?.unmount()
          root = null
          componentRef = null
        },
      }
    },
  }
}
