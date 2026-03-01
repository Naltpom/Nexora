import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { formatSize } from './utils'
import type { StorageDocument } from './types'
import './file_storage.scss'

interface FilePreviewProps {
  file?: StorageDocument
  localFile?: File
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showSize?: boolean
  onClick?: () => void
}

function getMimeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('msword')) return 'document'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz')) return 'archive'
  return 'generic'
}

const iconPaths: Record<string, string> = {
  image: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm7 8l-2-2-3 4h12l-4-5-3 3z',
  video: 'M15 10l5-3v10l-5-3V10zM4 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  audio: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8m8 4H8m2-8H8',
  spreadsheet: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  archive: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M10 12h1m-1 4h1m-1-8h1',
  generic: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6',
}

export default function FilePreview({ file, localFile, size = 'md', showName, showSize, onClick }: FilePreviewProps) {
  const { t } = useTranslation('file_storage')
  const [localUrl, setLocalUrl] = useState<string | null>(null)

  useEffect(() => {
    if (localFile && localFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(localFile)
      setLocalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setLocalUrl(null)
  }, [localFile])

  const isImage = file
    ? file.mime_type.startsWith('image/')
    : localFile?.type.startsWith('image/')

  const mimeType = file?.mime_type || localFile?.type || 'application/octet-stream'
  const iconType = getMimeIcon(mimeType)
  const fileName = file?.original_filename || localFile?.name || ''
  const fileSize = file?.size_bytes ?? localFile?.size

  const thumbnailUrl = file && file.has_thumbnail
    ? `/api/file-storage/files/${file.uuid}/thumbnail`
    : null

  const imgSrc = thumbnailUrl || localUrl

  const classNames = [
    'fs-preview',
    `fs-preview--${size}`,
    onClick ? 'fs-preview--clickable' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      aria-label={onClick ? t('btn_preview') : undefined}
    >
      {isImage && imgSrc ? (
        <img src={imgSrc} alt={fileName} className="fs-preview-img" />
      ) : (
        <svg
          className="fs-preview-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={iconPaths[iconType]} />
        </svg>
      )}
      {(showName || showSize) && (
        <div className="fs-preview-info">
          {showName && <span className="fs-preview-name" title={fileName}>{fileName}</span>}
          {showSize && fileSize != null && <span className="fs-preview-size">{formatSize(fileSize, t)}</span>}
        </div>
      )}
    </div>
  )
}
