import { ReactNode } from 'react'

export type SearchCategory = 'users' | 'announcements' | string

export interface SearchResult {
  id: string | number
  category: SearchCategory
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: string
  link?: string
  onSelect?: () => void
}

export interface SearchResultGroup {
  category: SearchCategory
  labelKey: string
  results: SearchResult[]
}

export interface SearchResultRenderer {
  category: SearchCategory
  labelKey: string
  transform: (rawData: any[]) => SearchResult[]
}

export interface CommandPaletteContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}
