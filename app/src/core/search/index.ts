import { registerSearchRenderer } from './searchRegistry'

// Register built-in search renderers
registerSearchRenderer({
  category: 'users',
  labelKey: 'search:category_users',
  transform: (raw) =>
    raw.map((u: any) => ({
      id: u.id,
      category: 'users' as const,
      title: `${u.first_name} ${u.last_name}`,
      subtitle: u.email,
      link: '/admin/users',
    })),
})

registerSearchRenderer({
  category: 'announcements',
  labelKey: 'search:category_announcements',
  transform: (raw) =>
    raw.map((a: any) => ({
      id: a.id,
      category: 'announcements' as const,
      title: a.title,
      subtitle: a.type,
      link: '/admin/announcements',
    })),
})

export { CommandPaletteProvider, useCommandPalette } from './CommandPaletteProvider'
export { CommandPalette } from './CommandPalette'
export { HeaderSearchTrigger } from './HeaderSearchTrigger'
export { SearchResultItem } from './SearchResultItem'
export { useSearch } from './useSearch'
export { useTableSearch } from './useTableSearch'
export { registerSearchRenderer, unregisterSearchRenderer, getSearchRenderer, transformSearchResults } from './searchRegistry'
export type { SearchResult, SearchResultGroup, SearchResultRenderer, SearchCategory, CommandPaletteContextType } from './types'

export const manifest = {
  name: 'search',
}
