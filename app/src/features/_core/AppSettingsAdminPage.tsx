import { useState, useEffect, useCallback, FormEvent } from 'react'
import Layout from '../../core/Layout'
import api from '../../api'

interface AppSetting {
  key: string
  value: string | null
  updated_at: string | null
}

const SETTING_LABELS: Record<string, { label: string; description: string; type: string }> = {
  app_name: { label: 'Nom de l\'application', description: 'Affiche dans le header et le titre de la page', type: 'text' },
  app_description: { label: 'Description', description: 'Courte description de l\'application', type: 'textarea' },
  app_logo: { label: 'Logo', description: 'URL ou chemin du logo (header)', type: 'logo' },
  app_favicon: { label: 'Favicon', description: 'URL ou chemin du favicon', type: 'text' },
  primary_color: { label: 'Couleur principale', description: 'Couleur de la marque (hex)', type: 'color' },
  support_email: { label: 'Email de support', description: 'Adresse email de contact', type: 'email' },
}

export default function AppSettingsAdminPage() {
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
      setError('Erreur lors du chargement des parametres')
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
        if (key !== 'app_logo') {
          payload[key] = value || null
        }
      }
      await api.put('/settings/', { settings: payload })
      setSuccess('Parametres enregistres avec succes')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde')
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
      setSuccess('Logo mis a jour')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const orderedKeys = ['app_name', 'app_description', 'app_logo', 'app_favicon', 'primary_color', 'support_email']

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Parametres' }]} title="Parametres de l'application">
      {/* Page Header */}
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Parametres de l'application</h1>
            <p>Configurez le nom, le logo et l'apparence de l'application</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          {/* Identite */}
          <div className="unified-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--gray-700)' }}>Identite</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nom de l'application</label>
                <input
                  type="text"
                  value={form.app_name || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, app_name: e.target.value }))}
                  placeholder="Mon Application"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Email de support</label>
                <input
                  type="email"
                  value={form.support_email || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, support_email: e.target.value }))}
                  placeholder="support@example.com"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
              <label>Description</label>
              <textarea
                value={form.app_description || ''}
                onChange={(e) => setForm(prev => ({ ...prev, app_description: e.target.value }))}
                rows={3}
                placeholder="Courte description de l'application"
              />
            </div>
          </div>

          {/* Apparence */}
          <div className="unified-card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--gray-700)' }}>Apparence</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* Logo */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Logo</label>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 8px 0' }}>URL ou chemin du logo (header)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.app_logo && (
                    <div style={{
                      backgroundColor: form.primary_color || '#1E40AF',
                      borderRadius: 8,
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      height: 44,
                      flexShrink: 0,
                    }}>
                      <img
                        src={form.app_logo}
                        alt="Logo"
                        style={{ height: 24, display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={form.app_logo || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, app_logo: e.target.value }))}
                      placeholder="/logo_full.svg"
                      style={{ marginBottom: 8 }}
                    />
                    <label
                      className="btn btn-secondary"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {uploading ? 'Upload...' : 'Uploader un logo'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleLogoUpload(f)
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Couleur + Favicon */}
              <div>
                <div className="form-group">
                  <label>Couleur principale</label>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 8px 0' }}>Couleur de la marque (hex)</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="color"
                      value={form.primary_color || '#1E40AF'}
                      onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      style={{ width: 44, height: 38, padding: 2, border: '1px solid var(--gray-300)', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={form.primary_color || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#1E40AF"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Favicon</label>
                  <input
                    type="text"
                    value={form.app_favicon || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, app_favicon: e.target.value }))}
                    placeholder="/favicon.ico"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Extra settings not in predefined keys */}
          {settings.filter(s => !orderedKeys.includes(s.key)).length > 0 && (
            <div className="unified-card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--gray-700)' }}>Autres</h3>
              {settings
                .filter(s => !orderedKeys.includes(s.key))
                .map(s => (
                  <div className="form-group" key={s.key}>
                    <label>{s.key}</label>
                    <input
                      type="text"
                      value={form[s.key] || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </div>
                ))
              }
            </div>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les parametres'}
            </button>
          </div>
        </form>
      )}
    </Layout>
  )
}
