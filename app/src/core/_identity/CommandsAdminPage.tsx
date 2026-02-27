import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('_identity')
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
      setMessage({ type: 'error', text: t('commands_admin.load_error') })
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
    const action = cmd.enabled ? t('commands_admin.confirm_toggle_action_deactivate') : t('commands_admin.confirm_toggle_action_activate')
    const confirmed = await confirm({
      title: cmd.enabled ? t('commands_admin.confirm_toggle_title_deactivate') : t('commands_admin.confirm_toggle_title_activate'),
      message: t('commands_admin.confirm_toggle_message', { action, label: cmd.label }),
      confirmText: cmd.enabled ? t('commands_admin.confirm_toggle_btn_deactivate') : t('commands_admin.confirm_toggle_btn_activate'),
      variant: cmd.enabled ? 'warning' : 'info',
    })
    if (!confirmed) return

    setToggling(cmd.name)
    setMessage(null)
    try {
      await api.patch(`/commands/${cmd.name}`, { enabled: !cmd.enabled })
      setMessage({ type: 'success', text: !cmd.enabled ? t('commands_admin.toggle_success_activated', { label: cmd.label }) : t('commands_admin.toggle_success_deactivated', { label: cmd.label }) })
      await loadCommands()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || t('commands_admin.toggle_error', { label: cmd.label }) })
    } finally {
      setToggling(null)
    }
  }

  const handleRun = async (cmd: Command) => {
    const confirmed = await confirm({
      title: t('commands_admin.confirm_run_title'),
      message: t('commands_admin.confirm_run_message', { label: cmd.label }),
      confirmText: t('commands_admin.confirm_run_btn'),
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
        text: t('commands_admin.run_success', { label: cmd.label, seconds: data.elapsed_seconds, result: resultText }),
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || t('commands_admin.run_error', { label: cmd.label }) })
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
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('commands_admin.breadcrumb_commands') }]} title={t('commands_admin.page_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('commands_admin.page_title')}</h1>
            <p>{t('commands_admin.subtitle')}</p>
          </div>
          <div className="unified-page-header-actions">
            <Link to="/admin/commands/history" className="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {t('commands_admin.btn_history')}
            </Link>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`alert-dynamic alert-dynamic--${message.type === 'success' ? 'success' : 'error'}`}
          role={message.type === 'success' ? 'status' : 'alert'}
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="spinner" role="status" aria-busy="true">
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : commands.length === 0 ? (
        <div className="unified-card empty-state">
          {t('commands_admin.empty_state')}
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Search bar */}
          <div className="section-header" role="search">
            <input
              type="text"
              placeholder={t('commands_admin.search_placeholder')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
              aria-label={t('commands_admin.search_placeholder')}
            />
          </div>

          <div className="table-container">
            <table className="unified-table">
              <caption className="sr-only">{t('a11y.table_caption_commands')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('commands_admin.th_command')}</th>
                  <th scope="col">{t('commands_admin.th_description')}</th>
                  <th scope="col">{t('commands_admin.th_feature')}</th>
                  <th scope="col">{t('commands_admin.th_schedule')}</th>
                  <th scope="col">{t('commands_admin.th_config')}</th>
                  <th scope="col" className="text-center">{t('commands_admin.th_active')}</th>
                  <th scope="col" className="text-center">{t('commands_admin.th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommands.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state-sm">
                      {search ? t('commands_admin.empty_search') : t('commands_admin.empty_state')}
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
                          <label className="toggle" aria-label={t('a11y.toggle_command', { label: cmd.label })}>
                            <input
                              type="checkbox"
                              checked={cmd.enabled}
                              onChange={() => handleToggle(cmd)}
                              disabled={toggling === cmd.name}
                              aria-checked={cmd.enabled}
                            />
                            <span className="toggle-slider" aria-hidden="true" />
                          </label>
                        ) : (
                          <span className={`badge ${cmd.enabled ? 'badge-success' : 'badge-warning'} text-xs`}>
                            {cmd.enabled ? t('common.active') : t('common.inactive')}
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
                            aria-label={!cmd.enabled ? t('commands_admin.tooltip_run_disabled') : t('commands_admin.tooltip_run')}
                            aria-busy={running === cmd.name}
                          >
                            {running === cmd.name ? (
                              <span className="spinner-sm" role="status">
                                <span className="sr-only">{t('common.loading')}</span>
                              </span>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
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
