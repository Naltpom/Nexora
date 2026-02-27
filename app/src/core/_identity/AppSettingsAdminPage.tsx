import { useState, useEffect, useCallback, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import Layout from '../../core/Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'

interface AppSetting {
  key: string
  value: string | null
  updated_at: string | null
}

export default function AppSettingsAdminPage() {
  const { t } = useTranslation('_identity')
  const { can } = usePermission()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/')
      const items: AppSetting[] = res.data
      setSettings(items)
      const formData: Record<string, string> = {}
      for (const s of items) {
        formData[s.key] = s.value || ''
      }
      setForm(formData)
    } catch {
      setError(t('app_settings.load_error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {}
      for (const [key, value] of Object.entries(form)) {
        if (key !== 'app_logo' && key !== 'app_favicon') {
          payload[key] = value || null
        }
      }
      await api.put('/settings/', { settings: payload })
      setSuccess(t('app_settings.save_success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('app_settings.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(prev => ({ ...prev, app_logo: res.data.logo_url }))
      setSuccess(t('app_settings.logo_updated'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('app_settings.upload_error'))
    } finally {
      setUploading(false)
    }
  }

  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  const handleFaviconUpload = async (file: File) => {
    setUploadingFavicon(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/settings/favicon', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setForm(prev => ({ ...prev, app_favicon: res.data.favicon_url }))
      setSuccess(t('app_settings.favicon_updated'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('app_settings.upload_error'))
    } finally {
      setUploadingFavicon(false)
    }
  }

  const handleResetLogo = async () => {
    setError('')
    try {
      const res = await api.delete('/settings/logo')
      setForm(prev => ({ ...prev, app_logo: res.data.logo_url }))
      setSuccess(t('app_settings.logo_reset'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('app_settings.reset_error'))
    }
  }

  const handleResetFavicon = async () => {
    setError('')
    try {
      const res = await api.delete('/settings/favicon')
      setForm(prev => ({ ...prev, app_favicon: res.data.favicon_url }))
      setSuccess(t('app_settings.favicon_reset'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('app_settings.reset_error'))
    }
  }

  const isLogoCustom = form.app_logo && form.app_logo !== '/logo_full.svg'
  const isFaviconCustom = form.app_favicon && form.app_favicon !== '/favicon.svg'

  const orderedKeys = ['app_name', 'app_description', 'app_logo', 'app_favicon', 'primary_color', 'support_email', 'header_show_logo', 'header_show_name']

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('app_settings.breadcrumb_settings') }]} title={t('app_settings.page_title')}>
      {/* Page Header */}
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('app_settings.page_title')}</h1>
            <p>{t('app_settings.subtitle')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center loading-pad-lg" aria-busy="true">
          <div className="spinner" role="status">
            <span className="sr-only">{t('common.loading')}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-label={t('a11y.form_app_settings')}>
          {error && <div className="alert alert-error mb-16" role="alert" aria-live="polite">{error}</div>}
          {success && <div className="alert alert-success mb-16" role="status" aria-live="polite">{success}</div>}

          {/* Identite */}
          <fieldset className="unified-card settings-section">
            <legend className="sr-only">{t('app_settings.section_identity')}</legend>
            <h2 className="settings-section-title">{t('app_settings.section_identity')}</h2>

            <div className="settings-grid">
              <div className="form-group mb-0">
                <label htmlFor="settings-app-name">{t('app_settings.label_app_name')}</label>
                <input
                  id="settings-app-name"
                  type="text"
                  value={form.app_name || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, app_name: e.target.value }))}
                  placeholder={t('app_settings.placeholder_app_name')}
                />
              </div>

              <div className="form-group mb-0">
                <label htmlFor="settings-support-email">{t('app_settings.label_support_email')}</label>
                <input
                  id="settings-support-email"
                  type="email"
                  value={form.support_email || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, support_email: e.target.value }))}
                  placeholder={t('app_settings.placeholder_support_email')}
                />
              </div>
            </div>

            <div className="form-group mt-16 mb-0">
              <label htmlFor="settings-description">{t('app_settings.label_description')}</label>
              <textarea
                id="settings-description"
                value={form.app_description || ''}
                onChange={(e) => setForm(prev => ({ ...prev, app_description: e.target.value }))}
                rows={3}
                placeholder={t('app_settings.placeholder_description')}
              />
            </div>
          </fieldset>

          {/* Apparence */}
          <fieldset className="unified-card settings-section">
            <legend className="sr-only">{t('app_settings.section_appearance')}</legend>
            <h2 className="settings-section-title">{t('app_settings.section_appearance')}</h2>

            <div className="settings-grid-align">
              {/* Logo */}
              <div className="form-group mb-0">
                <label htmlFor="settings-logo-url">{t('app_settings.label_logo')}</label>
                <p className="text-gray-500-sm mb-8" id="settings-logo-help">{t('app_settings.logo_help')}</p>
                <div className="flex-center-lg">
                  {form.app_logo && (
                    <div className="header-logo-icon flex-shrink-0" style={{ '--settings-logo-bg': form.primary_color || '#1E40AF' } as React.CSSProperties}>
                      <img
                        src={form.app_logo}
                        alt={t('a11y.logo_preview')}
                        className="logo-preview-img"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      id="settings-logo-url"
                      type="text"
                      value={form.app_logo || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, app_logo: e.target.value }))}
                      placeholder={t('app_settings.placeholder_logo')}
                      className="mb-8"
                      aria-describedby="settings-logo-help"
                    />
                    {can('settings.manage') && (
                      <div className="flex-center gap-8">
                        <label
                          className="btn btn-secondary cursor-pointer flex-center text-sm"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          {uploading ? t('app_settings.uploading_logo') : t('app_settings.upload_logo')}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden-input"
                            aria-label={t('app_settings.upload_logo')}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) handleLogoUpload(f)
                            }}
                          />
                        </label>
                        {isLogoCustom && (
                          <button type="button" className="btn btn-ghost text-sm" onClick={handleResetLogo} aria-label={t('a11y.reset_logo')}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                            {t('app_settings.reset_default')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Couleur principale */}
              <div className="form-group mb-0">
                <label htmlFor="settings-primary-color">{t('app_settings.label_primary_color')}</label>
                <p className="text-gray-500-sm mb-8" id="settings-color-help">{t('app_settings.primary_color_help')}</p>
                <div className="flex-center-lg">
                  <input
                    type="color"
                    value={form.primary_color || '#1E40AF'}
                    onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="color-picker-input"
                    aria-label={t('a11y.color_picker')}
                  />
                  <input
                    id="settings-primary-color"
                    type="text"
                    value={form.primary_color || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                    placeholder="#1E40AF"
                    className="flex-1"
                    aria-describedby="settings-color-help"
                  />
                </div>
              </div>
            </div>

            {/* Favicon -- full width row */}
            <div className="form-group mt-16 mb-0">
              <label htmlFor="settings-favicon-url">{t('app_settings.label_favicon')}</label>
              <p className="text-gray-500-sm mb-8" id="settings-favicon-help">{t('app_settings.favicon_help')}</p>
              <div className="flex-center-lg">
                {form.app_favicon && (
                  <img
                    src={form.app_favicon}
                    alt={t('a11y.favicon_preview')}
                    className="favicon-preview-img flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <input
                    id="settings-favicon-url"
                    type="text"
                    value={form.app_favicon || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, app_favicon: e.target.value }))}
                    placeholder={t('app_settings.placeholder_favicon')}
                    className="mb-8"
                    aria-describedby="settings-favicon-help"
                  />
                  {can('settings.manage') && (
                    <div className="flex-center gap-8">
                      <label
                        className="btn btn-secondary cursor-pointer flex-center text-sm"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {uploadingFavicon ? t('app_settings.uploading_favicon') : t('app_settings.upload_favicon')}
                        <input
                          type="file"
                          accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                          className="hidden-input"
                          aria-label={t('app_settings.upload_favicon')}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleFaviconUpload(f)
                          }}
                        />
                      </label>
                      {isFaviconCustom && (
                        <button type="button" className="btn btn-ghost text-sm" onClick={handleResetFavicon} aria-label={t('a11y.reset_favicon')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          {t('app_settings.reset_default')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Header toggles */}
            <div className="settings-grid mt-16">
              <div className="form-group mb-0">
                <div className="flex-between">
                  <div>
                    <label id="settings-show-logo-label">{t('app_settings.label_header_show_logo')}</label>
                    <p className="text-gray-500-sm">{t('app_settings.header_show_logo_help')}</p>
                  </div>
                  <label className="toggle" aria-label={t('app_settings.label_header_show_logo')}>
                    <input
                      type="checkbox"
                      checked={form.header_show_logo !== 'false'}
                      onChange={(e) => setForm(prev => ({ ...prev, header_show_logo: e.target.checked ? 'true' : 'false' }))}
                      aria-checked={form.header_show_logo !== 'false'}
                    />
                    <span className="toggle-slider" aria-hidden="true" />
                  </label>
                </div>
              </div>
              <div className="form-group mb-0">
                <div className="flex-between">
                  <div>
                    <label id="settings-show-name-label">{t('app_settings.label_header_show_name')}</label>
                    <p className="text-gray-500-sm">{t('app_settings.header_show_name_help')}</p>
                  </div>
                  <label className="toggle" aria-label={t('app_settings.label_header_show_name')}>
                    <input
                      type="checkbox"
                      checked={form.header_show_name !== 'false'}
                      onChange={(e) => setForm(prev => ({ ...prev, header_show_name: e.target.checked ? 'true' : 'false' }))}
                      aria-checked={form.header_show_name !== 'false'}
                    />
                    <span className="toggle-slider" aria-hidden="true" />
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Extra settings not in predefined keys */}
          {settings.filter(s => !orderedKeys.includes(s.key)).length > 0 && (
            <fieldset className="unified-card settings-section">
              <legend className="sr-only">{t('app_settings.section_other')}</legend>
              <h2 className="settings-section-title">{t('app_settings.section_other')}</h2>
              {settings
                .filter(s => !orderedKeys.includes(s.key))
                .map(s => (
                  <div className="form-group" key={s.key}>
                    <label htmlFor={`settings-other-${s.key}`}>{s.key}</label>
                    <input
                      id={`settings-other-${s.key}`}
                      type="text"
                      value={form[s.key] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </div>
                ))
              }
            </fieldset>
          )}

          {can('settings.manage') && (
            <div className="flex-end pt-8">
              <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
                {saving ? t('app_settings.submitting') : t('app_settings.submit')}
              </button>
            </div>
          )}
        </form>
      )}
    </Layout>
  )
}
