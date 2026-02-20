import { useState } from 'react'
import './mfa.scss'

interface Props {
  codes: string[]
  onClose?: () => void
}

export default function MFABackupCodes({ codes, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = codes.join('\n')
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const content = [
      'Codes de secours MFA',
      '====================',
      '',
      'Conservez ces codes en lieu sur.',
      'Chaque code ne peut etre utilise qu\'une seule fois.',
      '',
      ...codes,
      '',
      `Generes le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mfa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="unified-card mfa-backup-container">
      <div className="mfa-backup-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Ces codes ne seront affiches qu'une seule fois. Conservez-les en lieu sur.</span>
      </div>

      <div className="mfa-backup-grid">
        {codes.map((code, i) => (
          <div key={i} className="mfa-backup-code">
            {code}
          </div>
        ))}
      </div>

      <div className="mfa-backup-actions">
        <button className="btn btn-secondary btn-sm" onClick={handleCopyAll}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Copie !' : 'Copier tout'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Telecharger
        </button>
      </div>

      {onClose && (
        <div className="mfa-backup-close-row">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            J'ai sauvegarde mes codes
          </button>
        </div>
      )}
    </div>
  )
}
