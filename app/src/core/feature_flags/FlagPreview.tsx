import { useState, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'

interface EvalResult {
  feature_name: string
  enabled: boolean
  variant: string | null
  strategy: string
  reason: string
}

interface FlagPreviewProps {
  featureName: string
}

export default function FlagPreview({ featureName }: FlagPreviewProps) {
  const { t } = useTranslation('feature_flags')
  const [userId, setUserId] = useState('')
  const [result, setResult] = useState<EvalResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEvaluate = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    try {
      const res = await api.post('/feature-flags/evaluate', {
        feature_name: featureName,
        user_id: parseInt(userId),
      })
      setResult(res.data)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ff-preview">
      <h4 className="ff-preview-title">{t('preview_title')}</h4>
      <form className="ff-preview-form" onSubmit={handleEvaluate}>
        <input
          type="number"
          className="input ff-preview-input"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder={t('preview_user_placeholder')}
          min="1"
          required
        />
        <button type="submit" className="btn btn-primary ff-preview-btn" disabled={loading}>
          {t('preview_btn_evaluate')}
        </button>
      </form>
      {result && (
        <div className={`ff-preview-result ${result.enabled ? 'enabled' : 'disabled'}`}>
          <span className="ff-preview-result-status">
            {result.enabled ? t('preview_result_enabled') : t('preview_result_disabled')}
          </span>
          {result.variant && (
            <span className="ff-preview-result-detail">
              {t('preview_result_variant', { variant: result.variant })}
            </span>
          )}
          <span className="ff-preview-result-detail">
            {t('preview_result_reason', { reason: result.reason })}
          </span>
        </div>
      )}
    </div>
  )
}
