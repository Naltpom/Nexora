import { SearchResultRenderer, SearchResult, SearchResultGroup } from './types'

const renderers: Map<string, SearchResultRenderer> = new Map()

/**
 * Register a search result renderer for a given category.
 * Features can call this to add their own search result types.
 */
export function registerSearchRenderer(renderer: SearchResultRenderer): void {
  renderers.set(renderer.category, renderer)
}

/**
 * Unregister a search result renderer (useful for cleanup).
 */
export function unregisterSearchRenderer(category: string): void {
  renderers.delete(category)
}

/**
 * Get a renderer by category name.
 */
export function getSearchRenderer(category: string): SearchResultRenderer | undefined {
  return renderers.get(category)
}

/**
 * Transform raw API response into grouped search results.
 * The API returns an object keyed by category (e.g. { users: [...], announcements: [...] }).
 */
export function transformSearchResults(rawData: Record<string, any[]>): SearchResultGroup[] {
  const groups: SearchResultGroup[] = []

  for (const [category, items] of Object.entries(rawData)) {
    if (!items || items.length === 0) continue

    const renderer = renderers.get(category)
    if (!renderer) {
      // Fallback: render raw items with basic fields
      groups.push({
        category,
        labelKey: `search:category_${category}`,
        results: items.map((item: any) => ({
          id: item.id ?? item.name ?? String(Math.random()),
          category,
          title: item.title ?? item.name ?? item.label ?? String(item.id),
          subtitle: item.subtitle ?? item.description ?? item.email ?? undefined,
        })),
      })
    } else {
      const results: SearchResult[] = renderer.transform(items)
      if (results.length > 0) {
        groups.push({
          category,
          labelKey: renderer.labelKey,
          results,
        })
      }
    }
  }

  return groups
}
