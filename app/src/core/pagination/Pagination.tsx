import { useTranslation } from 'react-i18next'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  /** Label for the count display, e.g. "utilisateur" — auto-pluralized with 's' */
  itemLabel?: string
  /** Custom count display override (replaces default "N label(s)") */
  countDisplay?: string
  /** Per-page options (default: [10, 25, 50, 100]) */
  perPageOptions?: number[]
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export default function Pagination({
  page,
  totalPages,
  total,
  perPage,
  itemLabel,
  countDisplay,
  perPageOptions = [10, 25, 50, 100],
  onPageChange,
  onPerPageChange,
}: PaginationProps) {
  const { t } = useTranslation('common')

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc: (number | string)[], p, idx, arr) => {
      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
        acc.push('...')
      }
      acc.push(p)
      return acc
    }, [])

  const displayCount = countDisplay ?? (
    itemLabel
      ? `${total} ${itemLabel}${total > 1 ? 's' : ''}`
      : t('pagination_total', { count: total })
  )

  return (
    <nav className="unified-pagination" aria-label={t('pagination_aria_label')}>
      <span className="unified-pagination-info">{displayCount}</span>
      <div className="unified-pagination-controls">
        <select
          className="per-page-select"
          value={perPage}
          onChange={(e) => onPerPageChange(parseInt(e.target.value))}
          aria-label={t('pagination_per_page_aria')}
        >
          {perPageOptions.map((opt) => (
            <option key={opt} value={opt}>
              {t('pagination_per_page_option', { count: opt })}
            </option>
          ))}
        </select>
        {totalPages > 1 && (
          <>
            <button
              className="unified-pagination-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label={t('pagination_previous')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {pageNumbers.map((p, i) =>
              typeof p === 'string' ? (
                <span key={`dots-${i}`} className="unified-pagination-dots" aria-hidden="true">...</span>
              ) : (
                <button
                  key={p}
                  className={`unified-pagination-btn${p === page ? ' active' : ''}`}
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={t('pagination_page_number', { page: p })}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="unified-pagination-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label={t('pagination_next')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
