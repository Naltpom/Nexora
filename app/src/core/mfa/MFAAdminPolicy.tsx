import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import './mfa.scss'

interface Role {
  id: number
  name: string
  description: string
}

interface MFAPolicy {
  id: number
  role_id: number
  mfa_required: boolean
  allowed_methods: string[] | null
  grace_period_days: number
}

const ALL_METHODS = ['totp', 'email', 'backup']

export default function MFAAdminPolicy() {
  const { t } = useTranslation('mfa')

  const METHOD_LABELS: Record<string, string> = {
    totp: t('method_totp'),
    email: t('method_email'),
    backup: t('method_backup'),
  }
  const [roles, setRoles] = useState<Role[]>([])
  const [policies, setPolicies] = useState<Record<number, MFAPolicy>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null)

  // Editable state per role
  const [editState, setEditState] = useState<Record<number, {
    mfa_required: boolean
    allowed_methods: string[] | null
    grace_period_days: number
  }>>({})

  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles/')
      setRoles(res.data)
    } catch {
      setError(t('admin_error_loading_roles'))
    }
  }, [])

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await api.get('/mfa/policy')
      const policyList: MFAPolicy[] = res.data
      const map: Record<number, MFAPolicy> = {}
      for (const p of policyList) {
        map[p.role_id] = p
      }
      setPolicies(map)
    } catch {
      // Policy endpoint may not have entries yet
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchRoles(), fetchPolicies()]).finally(() => setLoading(false))
  }, [fetchRoles, fetchPolicies])

  // Initialize edit state from policies when they load
  useEffect(() => {
    const state: typeof editState = {}
    for (const role of roles) {
      const policy = policies[role.id]
      state[role.id] = {
        mfa_required: policy?.mfa_required ?? false,
        allowed_methods: policy?.allowed_methods ?? null,
        grace_period_days: policy?.grace_period_days ?? 0,
      }
    }
    setEditState(state)
  }, [roles, policies])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const updateEditField = (roleId: number, field: string, value: any) => {
    setEditState((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], [field]: value },
    }))
  }

  const toggleMethod = (roleId: number, method: string) => {
    setEditState((prev) => {
      const current = prev[roleId]
      if (!current) return prev

      let methods = current.allowed_methods ? [...current.allowed_methods] : [...ALL_METHODS]
      if (methods.includes(method)) {
        methods = methods.filter((m) => m !== method)
      } else {
        methods.push(method)
      }

      // If all methods selected, set to null (meaning "all")
      const allowed = methods.length === ALL_METHODS.length ? null : methods

      return {
        ...prev,
        [roleId]: { ...current, allowed_methods: allowed },
      }
    })
  }

  const isMethodChecked = (roleId: number, method: string) => {
    const state = editState[roleId]
    if (!state) return true
    if (state.allowed_methods === null) return true
    return state.allowed_methods.includes(method)
  }

  const handleSave = async (roleId: number) => {
    const state = editState[roleId]
    if (!state) return

    setSavingRoleId(roleId)
    setError('')

    try {
      await api.put(`/mfa/policy/${roleId}`, {
        mfa_required: state.mfa_required,
        allowed_methods: state.allowed_methods,
        grace_period_days: state.grace_period_days,
      })
      await fetchPolicies()
      showSuccess(t('admin_policy_updated'))
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin_error_saving'))
    } finally {
      setSavingRoleId(null)
    }
  }

  const handleDelete = async (roleId: number) => {
    setSavingRoleId(roleId)
    setError('')

    try {
      await api.delete(`/mfa/policy/${roleId}`)
      await fetchPolicies()
      // Reset edit state for this role
      setEditState((prev) => ({
        ...prev,
        [roleId]: { mfa_required: false, allowed_methods: null, grace_period_days: 0 },
      }))
      showSuccess(t('admin_policy_deleted'))
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin_error_deleting'))
    } finally {
      setSavingRoleId(null)
    }
  }

  if (loading) {
    return (
      <Layout breadcrumb={[{ label: t('admin_breadcrumb_home'), path: '/' }, { label: t('admin_breadcrumb_administration') }, { label: t('admin_breadcrumb_policy') }]} title={t('admin_breadcrumb_policy')}>
        <div className="loading-screen" aria-busy="true" role="status">
          <div className="spinner" aria-hidden="true" />
          <p>{t('loading')}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout breadcrumb={[{ label: t('admin_breadcrumb_home'), path: '/' }, { label: t('admin_breadcrumb_administration') }, { label: t('admin_breadcrumb_policy') }]} title={t('admin_breadcrumb_policy')}>
      <div className="mfa-admin-page-layout">
        <div>
          <h1 className="mfa-admin-page-title">{t('admin_page_title')}</h1>
          <p className="mfa-admin-page-desc">
            {t('admin_page_description')}
          </p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {successMessage && <div className="alert alert-success" role="status" aria-live="polite">{successMessage}</div>}

        <div className="unified-card">
          <div className="mfa-policy-table-wrapper" role="region" aria-label={t('admin_page_title')} tabIndex={0}>
            <table className="mfa-policy-table">
              <thead>
                <tr>
                  <th scope="col">{t('admin_table_role')}</th>
                  <th scope="col">{t('admin_table_mfa_required')}</th>
                  <th scope="col">{t('admin_table_allowed_methods')}</th>
                  <th scope="col">{t('admin_table_grace_period')}</th>
                  <th scope="col">{t('admin_table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mfa-policy-empty">
                      {t('admin_no_roles')}
                    </td>
                  </tr>
                )}
                {roles.map((role) => {
                  const state = editState[role.id]
                  const hasPolicy = !!policies[role.id]
                  const isSaving = savingRoleId === role.id

                  return (
                    <tr key={role.id}>
                      <td>
                        <div className="mfa-policy-role-name">{role.name}</div>
                        {role.description && (
                          <div className="mfa-policy-role-desc">{role.description}</div>
                        )}
                      </td>
                      <td>
                        <label className="mfa-toggle">
                          <input
                            type="checkbox"
                            checked={state?.mfa_required ?? false}
                            onChange={(e) => updateEditField(role.id, 'mfa_required', e.target.checked)}
                            aria-label={`${t('admin_table_mfa_required')} — ${role.name}`}
                          />
                          <span className="mfa-toggle-slider" aria-hidden="true" />
                        </label>
                      </td>
                      <td>
                        <div className="mfa-policy-methods">
                          {ALL_METHODS.map((method) => (
                            <label key={method} className="mfa-policy-method-checkbox">
                              <input
                                type="checkbox"
                                checked={isMethodChecked(role.id, method)}
                                onChange={() => toggleMethod(role.id, method)}
                                aria-label={t('admin_method_label', { method: METHOD_LABELS[method], role: role.name })}
                              />
                              <span>{METHOD_LABELS[method]}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="mfa-policy-grace-input"
                          value={state?.grace_period_days ?? 0}
                          onChange={(e) => updateEditField(role.id, 'grace_period_days', parseInt(e.target.value) || 0)}
                          min={0}
                          max={365}
                          aria-label={t('admin_grace_period_label', { role: role.name })}
                        />
                      </td>
                      <td>
                        <div className="mfa-policy-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSave(role.id)}
                            disabled={isSaving}
                            aria-busy={isSaving}
                          >
                            {isSaving ? t('admin_saving') : t('admin_save')}
                          </button>
                          {hasPolicy && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(role.id)}
                              disabled={isSaving}
                            >
                              {t('admin_delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
