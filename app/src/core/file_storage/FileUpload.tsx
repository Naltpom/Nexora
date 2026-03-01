import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFileUpload } from './useFileUpload'
import FilePreview from './FilePreview'
import { formatSize } from './utils'
import type { UploadConfig, StorageDocument } from './types'
import './file_storage.scss'

interface FileUploadProps {
  config: UploadConfig
  value?: StorageDocument | null
  onChange?: (doc: StorageDocument | null) => void
  label?: string
  hint?: string
  disabled?: boolean
  compact?: boolean
  required?: boolean
  id?: string
  className?: string
}

export default function FileUpload({
  config,
  value,
  onChange,
  label,
  hint,
  disabled,
  compact,
  required,
  id,
  className,
}: FileUploadProps) {
  const { t } = useTranslation('file_storage')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { uploads, validate, upload, cancel, isUploading } = useFileUpload(config, {
    onSuccess: (doc) => {
      setLocalFile(null)
      onChange?.(doc)
    },
    onError: (_clientId, err) => {
      setError(err)
    },
  })

  const currentUpload = uploads[uploads.length - 1]

  const handleFiles = useCallback((files: File[]) => {
    if (disabled) return
    setError(null)

    const { valid, errors } = validate(files)
    if (errors.length > 0) {
      setError(t(errors[0].message, { max: config.maxSizeBytes ? formatSize(config.maxSizeBytes, t) : '' }))
      return
    }
    if (valid.length === 0) return

    setLocalFile(valid[0])
    upload(valid.slice(0, 1))
  }, [disabled, validate, upload, config.maxSizeBytes, t])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) handleFiles(Array.from(files))
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files))
  }

  const handleRemove = () => {
    if (isUploading && currentUpload) {
      cancel(currentUpload.clientId)
    }
    setLocalFile(null)
    setError(null)
    onChange?.(null)
  }

  const hasFile = value || localFile
  const acceptStr = config.accept?.join(',')

  // Cleanup local URL on unmount
  useEffect(() => {
    return () => {
      setLocalFile(null)
    }
  }, [])

  const zoneClasses = [
    'fs-upload-zone',
    dragActive ? 'fs-upload-zone--active' : '',
    error ? 'fs-upload-zone--error' : '',
    disabled ? 'fs-upload-zone--disabled' : '',
    compact ? 'fs-upload-zone--compact' : '',
    hasFile ? 'fs-upload-zone--has-file' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <div className="fs-upload-wrapper">
      {label && (
        <label className="fs-upload-label" htmlFor={id}>
          {label}
          {required && <span className="fs-upload-required">*</span>}
        </label>
      )}

      <div
        className={zoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label={t('aria_dropzone')}
      >
        {hasFile ? (
          <div className="fs-upload-zone-preview">
            <FilePreview
              file={value || undefined}
              localFile={localFile || undefined}
              size={compact ? 'sm' : 'md'}
              showName={!compact}
              showSize={!compact}
            />
            {isUploading && currentUpload && (
              <div className="fs-upload-progress">
                <div
                  className="fs-upload-progress-bar"
                  style={{ '--fs-progress': `${currentUpload.progress}%` } as React.CSSProperties}
                  role="progressbar"
                  aria-valuenow={currentUpload.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('aria_progress', { percent: currentUpload.progress })}
                >
                  <div className="fs-upload-progress-fill" />
                </div>
                <span className="fs-upload-progress-text">{currentUpload.progress}%</span>
              </div>
            )}
            {!disabled && (
              <button
                type="button"
                className="fs-upload-zone-remove"
                onClick={handleRemove}
                aria-label={t('btn_remove')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="fs-upload-zone-trigger"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-label={t('aria_browse')}
          >
            <svg className="fs-upload-zone-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="fs-upload-zone-text">
              {value ? t('zone_replace') : t('zone_drop')}
            </span>
            <span className="fs-upload-zone-hint">
              {t('zone_or')} <span className="fs-upload-zone-browse">{t('zone_browse')}</span>
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={acceptStr}
          onChange={handleInputChange}
          disabled={disabled}
          className="fs-upload-input"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <div className="fs-upload-error" role="alert">
          {t(error, { max: config.maxSizeBytes ? formatSize(config.maxSizeBytes, t) : '' })}
        </div>
      )}

      {hint && !error && <div className="fs-upload-hint">{hint}</div>}

      {config.accept && config.accept.length > 0 && !hasFile && (
        <div className="fs-upload-hint">
          {t('zone_hint_types', { types: config.accept.join(', ') })}
          {config.maxSizeBytes && ` | ${t('zone_hint_size', { size: formatSize(config.maxSizeBytes, t) })}`}
        </div>
      )}
    </div>
  )
}
