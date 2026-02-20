import { useState, useEffect, useCallback } from 'react'
import Layout from '../../core/Layout'
import api from '../../api'
import './mfa.css'

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
const METHOD_LABELS: Record<string, string> = {
  totp: 'TOTP',
  email: 'Email',
  backup: 'Code de secours',
}

export default function MFAAdminPolicy() {
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
      setError('Erreur lors du chargement des roles')
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
      showSuccess('Politique MFA mise a jour')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde')
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
      showSuccess('Politique supprimee')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression')
    } finally {
      setSavingRoleId(null)
    }
  }

  if (loading) {
    return (
      <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Administration' }, { label: 'Politique MFA' }]} title="Politique MFA">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Administration' }, { label: 'Politique MFA' }]} title="Politique MFA">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Politique MFA par role</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Configurez les exigences d'authentification multi-facteurs pour chaque role.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        <div className="unified-card">
          <div className="mfa-policy-table-wrapper">
            <table className="mfa-policy-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>MFA requis</th>
                  <th>Methodes autorisees</th>
                  <th>Periode de grace (jours)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mfa-policy-empty">
                      Aucun role configure
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
                          />
                          <span className="mfa-toggle-slider" />
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
                        />
                      </td>
                      <td>
                        <div className="mfa-policy-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSave(role.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? '...' : 'Sauvegarder'}
                          </button>
                          {hasPolicy && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(role.id)}
                              disabled={isSaving}
                            >
                              Supprimer
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
