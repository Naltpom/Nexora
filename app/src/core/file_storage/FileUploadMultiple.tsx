import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFileUpload } from './useFileUpload'
import FilePreview from './FilePreview'
import FileList from './FileList'
import { formatSize } from './utils'
import type { UploadConfig, StorageDocument } from './types'
import './file_storage.scss'

interface FileUploadMultipleProps {
  config: UploadConfig
  value?: StorageDocument[]
  onChange?: (docs: StorageDocument[]) => void
  label?: string
  hint?: string
  disabled?: boolean
  showFileList?: boolean
  className?: string
}

export default function FileUploadMultiple({
  config,
  value = [],
  onChange,
  label,
  hint,
  disabled,
  showFileList = true,
  className,
}: FileUploadMultipleProps) {
  const { t } = useTranslation('file_storage')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const { uploads, validate, upload, cancel, dismiss, retry } = useFileUpload(config, {
    onSuccess: (doc) => {
      onChange?.([...value, doc])
    },
  })

  const handleFiles = useCallback((files: File[]) => {
    if (disabled) return
    setErrors([])

    const { valid, errors: validationErrors } = validate(files)
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) =>
        t(e.message, { max: config.maxSizeBytes ? formatSize(config.maxSizeBytes, t) : '', name: e.file.name })
      ))
    }
    if (valid.length > 0) {
      upload(valid)
    }
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

  const handleDeleteExisting = (uuid: string) => {
    onChange?.(value.filter((f) => f.uuid !== uuid))
  }

  const acceptStr = config.accept?.join(',')

  const zoneClasses = [
    'fs-upload-zone',
    'fs-upload-zone--multiple',
    dragActive ? 'fs-upload-zone--active' : '',
    disabled ? 'fs-upload-zone--disabled' : '',
    className || '',
  ].filter(Boolean).join(' ')

  return (
    <div className="fs-upload-wrapper">
      {label && <label className="fs-upload-label">{label}</label>}

      <div
        className={zoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label={t('aria_dropzone')}
      >
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
          <span className="fs-upload-zone-text">{t('zone_drop_multiple')}</span>
          <span className="fs-upload-zone-hint">
            {t('zone_or')} <span className="fs-upload-zone-browse">{t('zone_browse')}</span>
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="fs-upload-input"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {errors.length > 0 && (
        <div className="fs-upload-errors" role="alert">
          {errors.map((err, i) => (
            <div key={i} className="fs-upload-error">{err}</div>
          ))}
        </div>
      )}

      {hint && <div className="fs-upload-hint">{hint}</div>}

      {config.accept && config.accept.length > 0 && (
        <div className="fs-upload-hint">
          {t('zone_hint_types', { types: config.accept.join(', ') })}
          {config.maxSizeBytes && ` | ${t('zone_hint_size', { size: formatSize(config.maxSizeBytes, t) })}`}
          {config.maxFiles && ` | ${t('zone_hint_count', { count: config.maxFiles })}`}
        </div>
      )}

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="fs-upload-queue">
          {uploads.map((item) => (
            <div key={item.clientId} className={`fs-upload-item fs-upload-item--${item.status}`}>
              <FilePreview localFile={item.file} size="sm" />
              <div className="fs-upload-item-info">
                <span className="fs-upload-item-name">{item.file.name}</span>
                {item.status === 'uploading' && (
                  <div className="fs-upload-progress">
                    <div
                      className="fs-upload-progress-bar"
                      style={{ '--fs-progress': `${item.progress}%` } as React.CSSProperties}
                      role="progressbar"
                      aria-valuenow={item.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="fs-upload-progress-fill" />
                    </div>
                    <span className="fs-upload-progress-text">{item.progress}%</span>
                  </div>
                )}
                {item.status === 'success' && (
                  <span className="fs-upload-item-status fs-upload-item-status--success">{t('status_success')}</span>
                )}
                {item.status === 'error' && (
                  <span className="fs-upload-item-status fs-upload-item-status--error">
                    {item.error ? t(item.error) : t('status_error')}
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className="fs-upload-item-status fs-upload-item-status--pending">{t('status_pending')}</span>
                )}
              </div>
              <div className="fs-upload-item-actions">
                {(item.status === 'uploading' || item.status === 'pending') && (
                  <button
                    type="button"
                    className="fs-upload-item-btn"
                    onClick={() => cancel(item.clientId)}
                    aria-label={t('aria_cancel_upload', { name: item.file.name })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {item.status === 'error' && (
                  <button
                    type="button"
                    className="fs-upload-item-btn"
                    onClick={() => retry(item.clientId)}
                  >
                    {t('btn_retry')}
                  </button>
                )}
                {item.status === 'success' && (
                  <button
                    type="button"
                    className="fs-upload-item-btn"
                    onClick={() => dismiss(item.clientId)}
                    aria-label={t('btn_dismiss')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing files list */}
      {showFileList && value.length > 0 && (
        <FileList
          files={value}
          actions={['download', 'delete']}
          onDelete={(uuid) => handleDeleteExisting(uuid)}
          layout="list"
        />
      )}
    </div>
  )
}
