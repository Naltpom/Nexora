import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import FilePreview from './FilePreview'
import { formatSize } from './utils'
import type { StorageDocument } from './types'
import './file_storage.scss'

interface FileListProps {
  files: StorageDocument[]
  actions?: ('download' | 'delete' | 'preview')[]
  onDelete?: (uuid: string) => void
  onPreview?: (file: StorageDocument) => void
  layout?: 'list' | 'grid'
  loading?: boolean
  className?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString()
}

export default function FileList({
  files,
  actions = ['download', 'delete'],
  onDelete,
  onPreview,
  layout = 'list',
  loading,
  className,
}: FileListProps) {
  const { t } = useTranslation('file_storage')

  const handleDownload = useCallback(async (uuid: string, filename: string) => {
    try {
      const res = await api.get(`/file-storage/files/${uuid}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }, [])

  if (loading) {
    return (
      <div className="spinner" aria-busy="true" role="status">
        <span className="sr-only">{t('status_pending')}</span>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className={`fs-empty ${className || ''}`}>
        <p>{t('list_empty')}</p>
        <p className="fs-empty-hint">{t('list_empty_hint')}</p>
      </div>
    )
  }

  if (layout === 'grid') {
    return (
      <div className={`fs-file-grid ${className || ''}`} role="list" aria-label={t('aria_file_list')}>
        {files.map((file) => (
          <div key={file.uuid} className="fs-file-grid-item" role="listitem">
            <FilePreview
              file={file}
              size="lg"
              onClick={onPreview ? () => onPreview(file) : undefined}
            />
            <div className="fs-file-grid-item-info">
              <span className="fs-file-grid-item-name" title={file.original_filename}>
                {file.original_filename}
              </span>
              <span className="fs-file-grid-item-size">{formatSize(file.size_bytes, t)}</span>
            </div>
            <div className="fs-file-grid-item-actions">
              {actions.includes('download') && (
                <button
                  type="button"
                  className="fs-file-action-btn"
                  onClick={() => handleDownload(file.uuid, file.original_filename)}
                  aria-label={t('aria_download_file', { name: file.original_filename })}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              )}
              {actions.includes('delete') && onDelete && (
                <button
                  type="button"
                  className="fs-file-action-btn fs-file-action-btn--danger"
                  onClick={() => onDelete(file.uuid)}
                  aria-label={t('aria_delete_file', { name: file.original_filename })}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`fs-file-list ${className || ''}`} role="list" aria-label={t('aria_file_list')}>
      {files.map((file) => (
        <div key={file.uuid} className="fs-file-list-item" role="listitem">
          <FilePreview
            file={file}
            size="sm"
            onClick={onPreview ? () => onPreview(file) : undefined}
          />
          <div className="fs-file-list-item-info">
            <span className="fs-file-list-item-name" title={file.original_filename}>
              {file.original_filename}
            </span>
            <span className="fs-file-list-item-meta">
              {formatSize(file.size_bytes, t)} &middot; {formatDate(file.created_at)}
            </span>
          </div>
          <div className="fs-file-list-item-actions">
            {actions.includes('preview') && onPreview && (
              <button
                type="button"
                className="fs-file-action-btn"
                onClick={() => onPreview(file)}
                aria-label={t('btn_preview')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
            {actions.includes('download') && (
              <button
                type="button"
                className="fs-file-action-btn"
                onClick={() => handleDownload(file.uuid, file.original_filename)}
                aria-label={t('aria_download_file', { name: file.original_filename })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
            {actions.includes('delete') && onDelete && (
              <button
                type="button"
                className="fs-file-action-btn fs-file-action-btn--danger"
                onClick={() => onDelete(file.uuid)}
                aria-label={t('aria_delete_file', { name: file.original_filename })}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
