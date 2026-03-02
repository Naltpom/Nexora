import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { CommandPaletteContextType } from './types'
import { CommandPalette } from './CommandPalette'

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

export function useCommandPalette(): CommandPaletteContextType {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

interface CommandPaletteProviderProps {
  children: ReactNode
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Global keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  const contextValue = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  )

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      {isOpen && <CommandPalette onClose={close} />}
    </CommandPaletteContext.Provider>
  )
}
