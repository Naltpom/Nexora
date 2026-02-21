import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import { usePermission } from '../PermissionContext'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Command {
  name: string
  label: string
  description: string
  feature: string
  schedule: string
  config_keys: string[]
  enabled: boolean
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function CommandsAdminPage() {
  const { confirm } = useConfirm()
  const { can } = usePermission()
  const [commands, setCommands] = useState<Command[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState('')

  const loadCommands = useCallback(async () => {
    try {
      const res = await api.get('/commands')
      setCommands(res.data)
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du chargement des commandes' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCommands()
  }, [loadCommands])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value.toLowerCase())
    }, 200)
  }

  const handleToggle = async (cmd: Command) => {
    const action = cmd.enabled ? 'desactiver' : 'activer'
    const confirmed = await confirm({
      title: `${cmd.enabled ? 'Desactiver' : 'Activer'} la commande`,
      message: `Etes-vous sur de vouloir ${action} la commande "${cmd.label}" ?`,
      confirmText: cmd.enabled ? 'Desactiver' : 'Activer',
      variant: cmd.enabled ? 'warning' : 'info',
    })
    if (!confirmed) return

    setToggling(cmd.name)
    setMessage(null)
    try {
      await api.patch(`/commands/${cmd.name}`, { enabled: !cmd.enabled })
      setMessage({ type: 'success', text: `Commande "${cmd.label}" ${!cmd.enabled ? 'activee' : 'desactivee'}` })
      await loadCommands()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || `Erreur lors du changement de statut de "${cmd.label}"` })
    } finally {
      setToggling(null)
    }
  }

  const handleRun = async (cmd: Command) => {
    const confirmed = await confirm({
      title: 'Executer la commande',
      message: `Etes-vous sur de vouloir executer "${cmd.label}" ?`,
      confirmText: 'Executer',
      variant: 'info',
    })
    if (!confirmed) return

    setRunning(cmd.name)
    setMessage(null)
    try {
      const res = await api.post(`/commands/${cmd.name}/run`)
      const data = res.data
      const resultText = data.result
        ? Object.entries(data.result).map(([k, v]) => `${k}: ${v}`).join(', ')
        : 'OK'
      setMessage({
        type: 'success',
        text: `"${cmd.label}" executee en ${data.elapsed_seconds}s — ${resultText}`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || `Erreur lors de l'execution de "${cmd.label}"` })
    } finally {
      setRunning(null)
    }
  }

  // Filter by search
  const filteredCommands = search
    ? commands.filter(cmd =>
        cmd.name.toLowerCase().includes(search) ||
        cmd.label.toLowerCase().includes(search) ||
        cmd.description.toLowerCase().includes(search) ||
        cmd.feature.toLowerCase().includes(search)
      )
    : commands

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Commandes' }]} title="Commandes">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Commandes de maintenance</h1>
            <p>Gerez et executez les commandes de maintenance de l'application</p>
          </div>
          <div className="unified-page-header-actions">
            <Link to="/admin/commands/history" className="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Historique
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert-dynamic alert-dynamic--${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : commands.length === 0 ? (
        <div className="unified-card empty-state">
          Aucune commande trouvee
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Search bar */}
          <div className="section-header">
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
            />
          </div>

          <div className="table-container">
            <table className="unified-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Description</th>
                  <th>Feature</th>
                  <th>Schedule</th>
                  <th>Config</th>
                  <th className="text-center">Actif</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommands.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state-sm">
                      {search ? 'Aucune commande correspondante' : 'Aucune commande trouvee'}
                    </td>
                  </tr>
                ) : (
                  filteredCommands.map(cmd => (
                    <tr
                      key={cmd.name}
                      className={cmd.enabled ? '' : 'opacity-60'}
                    >
                      {/* Command name */}
                      <td>
                        <div>
                          <div className="font-medium">{cmd.label}</div>
                          <code className="text-gray-400-code">{cmd.name}</code>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="feature-desc-col">
                        {cmd.description || '\u2014'}
                      </td>

                      {/* Feature */}
                      <td className="text-gray-500-sm nowrap">
                        {cmd.feature || '\u2014'}
                      </td>

                      {/* Schedule */}
                      <td className="text-gray-500-sm nowrap">
                        {cmd.schedule ? (
                          <code className="text-gray-400-code">{cmd.schedule}</code>
                        ) : '\u2014'}
                      </td>

                      {/* Config keys */}
                      <td>
                        {cmd.config_keys.length > 0 ? (
                          <div className="flex-row-xs flex-wrap">
                            {cmd.config_keys.map(key => (
                              <span key={key} className="badge badge-secondary text-xs">{key}</span>
                            ))}
                          </div>
                        ) : '\u2014'}
                      </td>

                      {/* Toggle */}
                      <td className="text-center">
                        {can('commands.manage') ? (
                          <label className="toggle" style={{ cursor: toggling === cmd.name ? 'wait' : 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={cmd.enabled}
                              onChange={() => handleToggle(cmd)}
                              disabled={toggling === cmd.name}
                            />
                            <span className="toggle-slider" />
                          </label>
                        ) : (
                          <span className={`badge ${cmd.enabled ? 'badge-success' : 'badge-warning'} text-xs`}>
                            {cmd.enabled ? 'Actif' : 'Inactif'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-center">
                        {can('commands.manage') && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleRun(cmd)}
                            disabled={!cmd.enabled || running === cmd.name}
                            title={!cmd.enabled ? 'Commande desactivee' : 'Executer la commande'}
                          >
                            {running === cmd.name ? (
                              <span className="spinner-sm" />
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
