import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePermission } from '../../core/PermissionContext'
import Layout from '../../core/Layout'
import api from '../../api'
import '../_identity/_identity.scss'
import './notifications.scss'

/* -- Types -- */

interface EventType {
  event_type: string
  label: string
  category: string
  description: string | null
  admin_only: boolean
  feature: string
}

interface UserRulePreference {
  is_active: boolean
  channel_in_app: boolean
  channel_email: boolean
  channel_webhook: boolean
  is_customized: boolean
  webhook_ids: number[] | null
}

interface NotificationRule {
  id: number
  name: string
  created_by_id: number
  created_by_name: string | null
  event_types: string[]
  target_type: string
  target_user_ids: number[] | null
  channel_in_app: boolean
  channel_email: boolean
  channel_webhook: boolean
  webhook_ids: number[] | null
  default_in_app: boolean
  default_email: boolean
  default_webhook: boolean
  is_active: boolean
  is_default_template: boolean
  user_preference: UserRulePreference | null
  created_at: string
}

interface Webhook {
  id: number
  name: string | null
  url: string
  format: string
  prefix: string | null
  is_active: boolean
  is_global: boolean
  event_types: string[] | null
  notification_rule_ids: number[] | null
  created_at: string
}

interface RuleForm {
  name: string
  event_types: string[]
  target_type: string
  target_user_ids: number[]
  channel_in_app: boolean
  channel_email: boolean
  channel_webhook: boolean
  default_in_app: boolean
  default_email: boolean
  default_webhook: boolean
  is_default_template: boolean
}

const emptyRuleForm: RuleForm = {
  name: '',
  event_types: [],
  target_type: 'self',
  target_user_ids: [],
  channel_in_app: false,
  channel_email: false,
  channel_webhook: false,
  default_in_app: false,
  default_email: false,
  default_webhook: false,
  is_default_template: false,
}

/* -- Component -- */

export default function NotificationSettings() {
  const { t } = useTranslation('notification')
  const { can } = usePermission()
  const isNotifAdmin = can('notification.admin')
  // Data
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [myRules, setMyRules] = useState<NotificationRule[]>([])
  const [allRules, setAllRules] = useState<NotificationRule[]>([])
  const [myWebhooks, setMyWebhooks] = useState<Webhook[]>([])
  const [globalWebhooks, setGlobalWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  const [ruleForm, setRuleForm] = useState<RuleForm>({ ...emptyRuleForm })
  const [ruleScope, setRuleScope] = useState<'my' | 'global'>('my')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Webhook modal
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', secret: '', format: 'custom', prefix: '', is_global: false })

  // Active tab (synced with URL ?tab=)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialNotifTab = tabParam === 'webhooks' ? 'webhooks' as const : 'rules' as const
  const [activeTab, setActiveTabState] = useState<'rules' | 'webhooks'>(initialNotifTab)

  // Sync tab from URL when searchParams change (tutorial navigation)
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab === 'webhooks' && activeTab !== 'webhooks') setActiveTabState('webhooks')
    else if (urlTab === 'rules' && activeTab !== 'rules') setActiveTabState('rules')
  }, [searchParams])

  const setActiveTab = useCallback((tab: 'rules' | 'webhooks') => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  // Webhook multi-select dropdown
  const [openWebhookDropdown, setOpenWebhookDropdown] = useState<number | null>(null)
  const webhookDropdownRef = useRef<HTMLDivElement>(null)

  /* -- Data loading -- */

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const promises: Promise<any>[] = [
        api.get('/events/event-types'),
        api.get('/notifications/rules/my'),
        api.get('/notifications/webhooks/'),
      ]

      if (isNotifAdmin) {
        promises.push(
          api.get('/notifications/rules'),
          api.get('/notifications/webhooks/global'),
        )
      }

      const results = await Promise.all(promises.map(p => p.catch(() => ({ data: [] }))))

      setEventTypes(results[0].data || [])
      setMyRules(results[1].data || [])
      setMyWebhooks(results[2].data || [])

      if (isNotifAdmin) {
        setAllRules(results[3].data || [])
        setGlobalWebhooks(results[4].data || [])
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [isNotifAdmin])

  useEffect(() => { loadData() }, [loadData])

  // Close webhook dropdown on outside click
  useEffect(() => {
    if (!openWebhookDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (webhookDropdownRef.current && !webhookDropdownRef.current.contains(e.target as Node)) {
        setOpenWebhookDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openWebhookDropdown])

  /* -- Event types grouped by category -- */

  const eventsByCategory = eventTypes.reduce<Record<string, EventType[]>>((acc, et) => {
    if (et.admin_only && !isNotifAdmin) return acc
    if (!acc[et.category]) acc[et.category] = []
    acc[et.category].push(et)
    return acc
  }, {})

  /* -- Rule CRUD -- */

  const openCreateRule = (scope: 'my' | 'global') => {
    setEditingRule(null)
    setRuleScope(scope)
    const form = { ...emptyRuleForm }
    if (scope === 'my') form.target_type = 'self'
    if (scope === 'global') form.target_type = 'all'
    setRuleForm(form)
    setError('')
    setShowRuleModal(true)
  }

  const openEditRule = (rule: NotificationRule, scope: 'my' | 'global') => {
    setEditingRule(rule)
    setRuleScope(scope)
    setRuleForm({
      name: rule.name,
      event_types: rule.event_types,
      target_type: rule.target_type,
      target_user_ids: rule.target_user_ids || [],
      channel_in_app: rule.channel_in_app,
      channel_email: rule.channel_email,
      channel_webhook: rule.channel_webhook,
      default_in_app: rule.default_in_app,
      default_email: rule.default_email,
      default_webhook: rule.default_webhook,
      is_default_template: rule.is_default_template,
    })
    setError('')
    setShowRuleModal(true)
  }

  const saveRule = async () => {
    if (!ruleForm.name.trim()) {
      setError(t('rule_modal_error_name_required'))
      return
    }
    if (ruleForm.event_types.length === 0) {
      setError(t('rule_modal_error_event_required'))
      return
    }
    if (!ruleForm.channel_in_app && !ruleForm.channel_email && !ruleForm.channel_webhook) {
      setError(t('rule_modal_error_channel_required'))
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = { ...ruleForm }

      if (editingRule) {
        await api.put(`/notifications/rules/${editingRule.id}`, payload)
      } else {
        if (ruleScope === 'my') {
          await api.post('/notifications/rules/my', payload)
        } else {
          await api.post('/notifications/rules', payload)
        }
      }

      setShowRuleModal(false)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('rule_modal_error_save'))
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async (id: number) => {
    if (!confirm(t('rules_confirm_delete'))) return
    try {
      await api.delete(`/notifications/rules/${id}`)
      loadData()
    } catch {
      // silently handle
    }
  }

  const toggleRule = async (rule: NotificationRule, usePreference: boolean) => {
    try {
      if (usePreference) {
        const pref = rule.user_preference
        await api.put(`/notifications/rules/${rule.id}/preferences`, {
          is_active: pref ? !pref.is_active : false,
        })
      } else {
        await api.patch(`/notifications/rules/${rule.id}/toggle`)
      }
      loadData()
    } catch {
      // silently handle
    }
  }

  const toggleTemplateChannel = async (rule: NotificationRule, channel: 'channel_in_app' | 'channel_email') => {
    try {
      const pref = rule.user_preference
      const currentValue = pref ? pref[channel] : rule[channel]
      await api.put(`/notifications/rules/${rule.id}/preferences`, {
        [channel]: !currentValue,
      })
      loadData()
    } catch {
      // silently handle
    }
  }

  const toggleWebhookForRule = async (rule: NotificationRule, webhookId: number) => {
    try {
      const currentIds = rule.user_preference?.webhook_ids || []
      const newIds = currentIds.includes(webhookId)
        ? currentIds.filter(id => id !== webhookId)
        : [...currentIds, webhookId]
      await api.put(`/notifications/rules/${rule.id}/preferences`, {
        webhook_ids: newIds,
      })
      loadData()
    } catch {
      // silently handle
    }
  }

  const togglePersonalChannel = async (rule: NotificationRule, channel: 'channel_in_app' | 'channel_email') => {
    try {
      await api.put(`/notifications/rules/${rule.id}`, { [channel]: !rule[channel] })
      loadData()
    } catch {
      // silently handle
    }
  }

  const togglePersonalWebhook = async (rule: NotificationRule, webhookId: number) => {
    try {
      const currentIds = rule.webhook_ids || []
      const newIds = currentIds.includes(webhookId)
        ? currentIds.filter(id => id !== webhookId)
        : [...currentIds, webhookId]
      await api.put(`/notifications/rules/${rule.id}`, {
        webhook_ids: newIds,
        channel_webhook: newIds.length > 0,
      })
      loadData()
    } catch {
      // silently handle
    }
  }

  const toggleAdminChannel = async (
    rule: NotificationRule,
    channel: 'channel_in_app' | 'channel_email' | 'channel_webhook'
  ) => {
    try {
      await api.put(`/notifications/rules/${rule.id}`, {
        [channel]: !rule[channel],
      })
      loadData()
    } catch {
      // silently handle
    }
  }

  /* -- Webhook CRUD -- */

  const openCreateWebhook = (isGlobal: boolean) => {
    setEditingWebhook(null)
    setWebhookForm({ name: '', url: '', secret: '', format: 'custom', prefix: '', is_global: isGlobal })
    setError('')
    setShowWebhookModal(true)
  }

  const openEditWebhook = (wh: Webhook) => {
    setEditingWebhook(wh)
    setWebhookForm({ name: wh.name || '', url: wh.url, secret: '', format: wh.format || 'custom', prefix: wh.prefix || '', is_global: wh.is_global })
    setError('')
    setShowWebhookModal(true)
  }

  const saveWebhook = async () => {
    if (!webhookForm.url.trim()) {
      setError(t('webhook_modal_error_url_required'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload: any = {
        name: webhookForm.name || null,
        url: webhookForm.url,
        secret: webhookForm.secret || null,
        format: webhookForm.format,
        prefix: webhookForm.prefix || null,
      }
      if (editingWebhook) {
        const endpoint = editingWebhook.is_global
          ? `/notifications/webhooks/global/${editingWebhook.id}`
          : `/notifications/webhooks/${editingWebhook.id}`
        await api.put(endpoint, payload)
      } else {
        const endpoint = webhookForm.is_global
          ? '/notifications/webhooks/global'
          : '/notifications/webhooks/'
        await api.post(endpoint, payload)
      }
      setShowWebhookModal(false)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('webhook_modal_error_save'))
    } finally {
      setSaving(false)
    }
  }

  const deleteWebhook = async (wh: Webhook) => {
    if (!confirm(t('webhooks_confirm_delete'))) return
    try {
      const endpoint = wh.is_global
        ? `/notifications/webhooks/global/${wh.id}`
        : `/notifications/webhooks/${wh.id}`
      await api.delete(endpoint)
      loadData()
    } catch {
      // silently handle
    }
  }

  const testWebhook = async (id: number) => {
    try {
      const res = await api.post(`/notifications/webhooks/${id}/test`)
      const data = res.data
      if (data.ok) {
        window.alert(t('webhooks_test_success', { status_code: data.status_code }))
      } else {
        window.alert(t('webhooks_test_failure', { detail: data.detail || data.error || `HTTP ${data.status_code}` }))
      }
    } catch (err: any) {
      window.alert(err.response?.data?.detail || t('webhooks_test_error'))
    }
  }

  /* -- Toggle event type in form -- */

  const toggleEventType = (et: string) => {
    setRuleForm(prev => ({
      ...prev,
      event_types: prev.event_types.includes(et)
        ? prev.event_types.filter(e => e !== et)
        : [...prev.event_types, et],
    }))
  }

  const toggleAllEvents = () => {
    const allTypes = eventTypes.filter(et => !et.admin_only || isNotifAdmin).map(et => et.event_type)
    if (ruleForm.event_types.length === allTypes.length) {
      setRuleForm(prev => ({ ...prev, event_types: [] }))
    } else {
      setRuleForm(prev => ({ ...prev, event_types: allTypes }))
    }
  }

  /* -- Render helpers -- */

  const renderRuleRow = (rule: NotificationRule, scope: 'my' | 'global') => {
    const locked = rule.is_default_template && scope === 'my'
    const showBadges = scope !== 'my' || isNotifAdmin

    return (
      <tr key={rule.id} className={locked ? 'notif-rule-locked' : ''}>
        <td>
          <span className="notif-rule-name">{rule.name}</span>
          {showBadges && rule.is_default_template && (
            <span className="notif-rule-template-badge">{t('rules_badge_template')}</span>
          )}
          {showBadges && locked && rule.user_preference?.is_customized && (
            <span className="notif-rule-template-badge notif-badge-personalized">
              {t('rules_badge_personalized')}
            </span>
          )}
          {showBadges && locked && (
            <span className="notif-rule-template-badge notif-rule-admin-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="notif-lock-icon">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {t('rules_badge_admin')}
            </span>
          )}
        </td>
        <td>
          <div className="notif-event-tags">
            {rule.event_types.length > 3 ? (
              <span className="notif-event-tag">{t('rules_events_count', { count: rule.event_types.length })}</span>
            ) : (
              rule.event_types.map(et => (
                <span key={et} className="notif-event-tag">{et}</span>
              ))
            )}
          </div>
        </td>
        <td>
          {scope === 'global' ? (
            <div className="notif-channels notif-admin-channel-toggles">
              <label className="notif-admin-channel-toggle">
                <span className="notif-toggle notif-toggle-sm">
                  <input
                    type="checkbox"
                    checked={rule.channel_in_app}
                    onChange={() => toggleAdminChannel(rule, 'channel_in_app')}
                  />
                  <span className="notif-toggle-slider" />
                </span>
                <span className="notif-admin-channel-label">In-App</span>
              </label>
              <label className="notif-admin-channel-toggle">
                <span className="notif-toggle notif-toggle-sm">
                  <input
                    type="checkbox"
                    checked={rule.channel_email}
                    onChange={() => toggleAdminChannel(rule, 'channel_email')}
                  />
                  <span className="notif-toggle-slider" />
                </span>
                <span className="notif-admin-channel-label">Email</span>
              </label>
              <label className="notif-admin-channel-toggle">
                <span className="notif-toggle notif-toggle-sm">
                  <input
                    type="checkbox"
                    checked={rule.channel_webhook}
                    onChange={() => toggleAdminChannel(rule, 'channel_webhook')}
                  />
                  <span className="notif-toggle-slider" />
                </span>
                <span className="notif-admin-channel-label">Webhook</span>
              </label>
            </div>
          ) : locked ? (
            <div className="notif-channels">
              {rule.channel_in_app && (
                <button
                  className={`notif-channel-btn in-app ${(rule.user_preference ? rule.user_preference.channel_in_app : rule.default_in_app) ? 'active' : ''}`}
                  onClick={() => toggleTemplateChannel(rule, 'channel_in_app')}
                >
                  In-App
                </button>
              )}
              {rule.channel_email && (
                <button
                  className={`notif-channel-btn email ${(rule.user_preference ? rule.user_preference.channel_email : rule.default_email) ? 'active' : ''}`}
                  onClick={() => toggleTemplateChannel(rule, 'channel_email')}
                >
                  Email
                </button>
              )}
              {rule.channel_webhook && myWebhooks.length > 0 && (
                <div className="multi-select-container" ref={openWebhookDropdown === rule.id ? webhookDropdownRef : undefined}>
                  <div
                    className="multi-select-trigger"
                    onClick={() => setOpenWebhookDropdown(openWebhookDropdown === rule.id ? null : rule.id)}
                  >
                    <div className="webhook-badges">
                      {(rule.user_preference?.webhook_ids || []).length > 0 ? (
                        (rule.user_preference?.webhook_ids || []).map(whId => {
                          const wh = myWebhooks.find(w => w.id === whId)
                          if (!wh) return null
                          return (
                            <span key={whId} className="webhook-badge webhook-badge-indigo">
                              {wh.name || 'Webhook'}
                            </span>
                          )
                        })
                      ) : (
                        <span className="notif-webhook-placeholder">{t('rules_webhook_placeholder')}</span>
                      )}
                    </div>
                  </div>
                  {openWebhookDropdown === rule.id && (
                    <div className="multi-select-dropdown">
                      {myWebhooks.map(wh => {
                        const selected = (rule.user_preference?.webhook_ids || []).includes(wh.id)
                        return (
                          <label key={wh.id} className="multi-select-option">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleWebhookForRule(rule, wh.id)}
                            />
                            <span className="webhook-badge webhook-badge-indigo">
                              {wh.name || 'Webhook'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="notif-channels">
              <button
                className={`notif-channel-btn in-app ${rule.channel_in_app ? 'active' : ''}`}
                onClick={() => togglePersonalChannel(rule, 'channel_in_app')}
              >
                In-App
              </button>
              <button
                className={`notif-channel-btn email ${rule.channel_email ? 'active' : ''}`}
                onClick={() => togglePersonalChannel(rule, 'channel_email')}
              >
                Email
              </button>
              {myWebhooks.length > 0 && (
                <div className="multi-select-container" ref={openWebhookDropdown === rule.id ? webhookDropdownRef : undefined}>
                  <div
                    className="multi-select-trigger"
                    onClick={() => setOpenWebhookDropdown(openWebhookDropdown === rule.id ? null : rule.id)}
                  >
                    <div className="webhook-badges">
                      {(rule.webhook_ids || []).length > 0 ? (
                        (rule.webhook_ids || []).map(whId => {
                          const wh = myWebhooks.find(w => w.id === whId)
                          if (!wh) return null
                          return (
                            <span key={whId} className="webhook-badge webhook-badge-indigo">
                              {wh.name || 'Webhook'}
                            </span>
                          )
                        })
                      ) : (
                        <span className="notif-webhook-placeholder">{t('rules_webhook_placeholder')}</span>
                      )}
                    </div>
                  </div>
                  {openWebhookDropdown === rule.id && (
                    <div className="multi-select-dropdown">
                      {myWebhooks.map(wh => {
                        const selected = (rule.webhook_ids || []).includes(wh.id)
                        return (
                          <label key={wh.id} className="multi-select-option">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => togglePersonalWebhook(rule, wh.id)}
                            />
                            <span className="webhook-badge webhook-badge-indigo">
                              {wh.name || 'Webhook'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </td>
        <td>
          <label className="notif-toggle">
            <input
              type="checkbox"
              checked={locked ? (rule.user_preference ? rule.user_preference.is_active : rule.is_active) : rule.is_active}
              onChange={() => toggleRule(rule, locked)}
            />
            <span className="notif-toggle-slider" />
          </label>
        </td>
        <td>
          {locked ? (
            <div className="notif-actions notif-actions-locked" title={t('rules_locked_title')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          ) : (
            <div className="notif-actions">
              <button
                className="btn-icon btn-icon-secondary"
                onClick={() => openEditRule(rule, scope)}
                title={t('rules_edit_title')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                className="btn-icon btn-icon-danger"
                onClick={() => deleteRule(rule.id)}
                title={t('rules_delete_title')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  const renderRulesTable = (rules: NotificationRule[], scope: 'my' | 'global') => (
    <div className="table-container">
      <table className="notif-rules-table">
        <colgroup>
          <col className="col-nom" />
          <col className="col-events" />
          <col className="col-canaux" />
          <col className="col-actif" />
          <col className="col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>{t('rules_column_name')}</th>
            <th>{t('rules_column_events')}</th>
            <th>{t('rules_column_channels')}</th>
            <th>{t('rules_column_active')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr><td colSpan={5} className="notif-rules-empty">{t('rules_empty')}</td></tr>
          ) : (
            rules.map(r => renderRuleRow(r, scope))
          )}
        </tbody>
      </table>
    </div>
  )

  const renderWebhookCard = (wh: Webhook) => (
    <div key={wh.id} className="notif-webhook-card">
      <div className="notif-webhook-info">
        <div className="notif-webhook-name">
          {wh.name || 'Webhook'}
          {wh.format && wh.format !== 'custom' && (
            <span className="notif-event-tag notif-format-tag">{wh.format}</span>
          )}
        </div>
        <div className="notif-webhook-url">{wh.url}</div>
        {wh.prefix && (
          <div className="notif-webhook-url italic">{t('webhooks_prefix_label', { prefix: wh.prefix })}</div>
        )}
      </div>
      <div className="notif-webhook-actions">
        <button className="btn-icon btn-icon-secondary" onClick={() => testWebhook(wh.id)} title={t('webhooks_test_title')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-secondary" onClick={() => openEditWebhook(wh)} title={t('webhooks_edit_title')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-danger" onClick={() => deleteWebhook(wh)} title={t('webhooks_delete_title')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )

  /* -- Render -- */

  if (loading) {
    return (
      <Layout title="Notifications" breadcrumb={[{ label: t('breadcrumb_home'), path: '/' }, { label: t('breadcrumb_notifications'), path: '/notifications' }, { label: t('breadcrumb_settings') }]}>
        <div className="notif-loading-center">
          <div className="spinner" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Notifications" breadcrumb={[{ label: t('breadcrumb_home'), path: '/' }, { label: t('breadcrumb_notifications'), path: '/notifications' }, { label: t('breadcrumb_settings') }]}>
      {/* Page Header */}
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('settings_page_title')}</h1>
            <p>{t('settings_page_subtitle')}</p>
          </div>
          <div className="unified-page-header-actions">
            <div className="notif-tabs">
              <button
                className={`notif-tab ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => setActiveTab('rules')}
              >
                {t('settings_tab_rules')}
              </button>
              <button
                className={`notif-tab ${activeTab === 'webhooks' ? 'active' : ''}`}
                onClick={() => setActiveTab('webhooks')}
              >
                {t('settings_tab_webhooks')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'rules' && (
        <>
          {/* Section 1: Personal Rules */}
          <div className="unified-card notif-section">
            <div className="notif-section-header">
              <div>
                <div className="notif-section-title">
                  <h3>{t('rules_personal_title')}</h3>
                  <span className="notif-scope-badge personal">{t('rules_personal_badge')}</span>
                </div>
                <div className="notif-section-desc">{t('rules_personal_desc')}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => openCreateRule('my')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('rules_add_button')}
              </button>
            </div>
            {renderRulesTable(myRules, 'my')}
          </div>

          {/* Section 2: Global Rules */}
          {can('notification.admin') && (
            <div className="unified-card notif-section">
              <div className="notif-section-header">
                <div>
                  <div className="notif-section-title">
                    <h3>{t('rules_global_title')}</h3>
                    <span className="notif-scope-badge super-admin">{t('rules_global_badge')}</span>
                  </div>
                  <div className="notif-section-desc">{t('rules_global_desc')}</div>
                </div>
                {can('notification.rules.create') && (
                  <button className="btn btn-sm btn-primary" onClick={() => openCreateRule('global')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('rules_add_button')}
                  </button>
                )}
              </div>
              {renderRulesTable(allRules, 'global')}
            </div>
          )}
        </>
      )}

      {activeTab === 'webhooks' && (
        <>
          {/* Personal Webhooks */}
          <div className="unified-card notif-section">
            <div className="notif-section-header">
              <div>
                <div className="notif-section-title">
                  <h3>{t('webhooks_personal_title')}</h3>
                  <span className="notif-scope-badge personal">{t('webhooks_personal_badge')}</span>
                </div>
                <div className="notif-section-desc">{t('webhooks_personal_desc')}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => openCreateWebhook(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('webhooks_add_button')}
              </button>
            </div>
            {myWebhooks.length === 0 ? (
              <div className="notif-webhook-empty">{t('webhooks_personal_empty')}</div>
            ) : (
              <div className="notif-webhook-list">
                {myWebhooks.map(wh => renderWebhookCard(wh))}
              </div>
            )}
          </div>

          {/* Global Webhooks */}
          {can('notification.webhook.global.read') && (
            <div className="unified-card notif-section">
              <div className="notif-section-header">
                <div>
                  <div className="notif-section-title">
                    <h3>{t('webhooks_global_title')}</h3>
                    <span className="notif-scope-badge super-admin">{t('webhooks_global_badge')}</span>
                  </div>
                  <div className="notif-section-desc">{t('webhooks_global_desc')}</div>
                </div>
                {can('notification.webhook.global.create') && (
                  <button className="btn btn-sm btn-primary" onClick={() => openCreateWebhook(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('webhooks_add_button')}
                  </button>
                )}
              </div>
              {globalWebhooks.length === 0 ? (
                <div className="notif-webhook-empty">{t('webhooks_global_empty')}</div>
              ) : (
                <div className="notif-webhook-list">
                  {globalWebhooks.map(wh => renderWebhookCard(wh))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* -- Rule Modal -- */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal notif-modal-rule" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRule ? t('rule_modal_title_edit') : t('rule_modal_title_create')}</h2>
              <button className="modal-close" onClick={() => setShowRuleModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error notif-alert-spaced">{error}</div>}

              <div className="form-group">
                <label>{t('rule_modal_label_name')}</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('rule_modal_name_placeholder')}
                />
              </div>

              <div className="form-group">
                <label>
                  {t('rule_modal_label_event_types')}
                  <button type="button" onClick={toggleAllEvents} className="notif-toggle-all">
                    {ruleForm.event_types.length === eventTypes.filter(et => !et.admin_only || isNotifAdmin).length ? t('rule_modal_toggle_all_uncheck') : t('rule_modal_toggle_all_check')}
                  </button>
                </label>
                <div className="notif-event-checkboxes">
                  {Object.entries(eventsByCategory).map(([category, events]) => (
                    <div key={category} className="notif-display-contents">
                      <div className="notif-event-category">{category}</div>
                      {events.map(et => (
                        <label key={et.event_type} className="notif-event-checkbox">
                          <input
                            type="checkbox"
                            checked={ruleForm.event_types.includes(et.event_type)}
                            onChange={() => toggleEventType(et.event_type)}
                          />
                          {et.label}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Target type */}
              {ruleScope === 'global' && (
                <div className="form-group">
                  <label>{t('rule_modal_label_recipients')}</label>
                  <select
                    value={ruleForm.target_type}
                    onChange={e => setRuleForm(prev => ({ ...prev, target_type: e.target.value }))}
                  >
                    <option value="all">{t('rule_modal_target_all')}</option>
                    <option value="users">{t('rule_modal_target_users')}</option>
                    <option value="event_target">{t('rule_modal_target_event')}</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>{t('rule_modal_label_channels')}</label>
                <div className="notif-channel-options">
                  <label className="notif-channel-option">
                    <input
                      type="checkbox"
                      checked={ruleForm.channel_in_app}
                      onChange={e => setRuleForm(prev => ({
                        ...prev,
                        channel_in_app: e.target.checked,
                        ...(!e.target.checked && { default_in_app: false }),
                      }))}
                    />
                    In-App
                  </label>
                  <label className="notif-channel-option">
                    <input
                      type="checkbox"
                      checked={ruleForm.channel_email}
                      onChange={e => setRuleForm(prev => ({
                        ...prev,
                        channel_email: e.target.checked,
                        ...(!e.target.checked && { default_email: false }),
                      }))}
                    />
                    Email
                  </label>
                  <label className="notif-channel-option">
                    <input
                      type="checkbox"
                      checked={ruleForm.channel_webhook}
                      onChange={e => setRuleForm(prev => ({
                        ...prev,
                        channel_webhook: e.target.checked,
                        ...(!e.target.checked && { default_webhook: false }),
                      }))}
                    />
                    Webhook
                  </label>
                </div>
              </div>

              {/* Default template toggle */}
              {ruleScope === 'global' && isNotifAdmin && (
                <div className="form-group">
                  <label className="notif-channel-option">
                    <input
                      type="checkbox"
                      checked={ruleForm.is_default_template}
                      onChange={e => setRuleForm(prev => ({ ...prev, is_default_template: e.target.checked }))}
                    />
                    {t('rule_modal_template_default')}
                  </label>
                </div>
              )}

              {/* Default channels for users (only for templates) */}
              {ruleScope === 'global' && isNotifAdmin && ruleForm.is_default_template && (
                <div className="form-group">
                  <label>{t('rule_modal_label_default_channels')}</label>
                  <p className="notif-default-channels-desc">
                    {t('rule_modal_default_channels_desc')}
                  </p>
                  <div className="notif-channel-options">
                    <label className={`notif-channel-option${!ruleForm.channel_in_app ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={ruleForm.default_in_app}
                        disabled={!ruleForm.channel_in_app}
                        onChange={e => setRuleForm(prev => ({ ...prev, default_in_app: e.target.checked }))}
                      />
                      In-App
                    </label>
                    <label className={`notif-channel-option${!ruleForm.channel_email ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={ruleForm.default_email}
                        disabled={!ruleForm.channel_email}
                        onChange={e => setRuleForm(prev => ({ ...prev, default_email: e.target.checked }))}
                      />
                      Email
                    </label>
                    <label className={`notif-channel-option${!ruleForm.channel_webhook ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={ruleForm.default_webhook}
                        disabled={!ruleForm.channel_webhook}
                        onChange={e => setRuleForm(prev => ({ ...prev, default_webhook: e.target.checked }))}
                      />
                      Webhook
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>{t('rule_modal_cancel')}</button>
              <button className="btn btn-primary" onClick={saveRule} disabled={saving}>
                {saving ? t('rule_modal_saving') : editingRule ? t('rule_modal_save_edit') : t('rule_modal_save_create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Webhook Modal -- */}
      {showWebhookModal && (
        <div className="modal-overlay" onClick={() => setShowWebhookModal(false)}>
          <div className="modal notif-modal-webhook" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingWebhook ? t('webhook_modal_title_edit') : t('webhook_modal_title_create')}</h2>
              <button className="modal-close" onClick={() => setShowWebhookModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error notif-alert-spaced">{error}</div>}

              <div className="form-group">
                <label>{t('webhook_modal_label_name')}</label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={e => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('webhook_modal_name_placeholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('webhook_modal_label_format')}</label>
                <select
                  value={webhookForm.format}
                  onChange={e => setWebhookForm(prev => ({ ...prev, format: e.target.value }))}
                >
                  <option value="custom">{t('webhook_modal_format_custom')}</option>
                  <option value="slack">{t('webhook_modal_format_slack')}</option>
                  <option value="discord">{t('webhook_modal_format_discord')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('webhook_modal_label_url')}</label>
                <input
                  type="text"
                  value={webhookForm.url}
                  onChange={e => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder={webhookForm.format === 'slack' ? 'https://hooks.slack.com/services/...' : webhookForm.format === 'discord' ? 'https://discord.com/api/webhooks/...' : 'https://example.com/webhook'}
                />
              </div>

              <div className="form-group">
                <label>{t('webhook_modal_label_secret')}</label>
                <input
                  type="text"
                  value={webhookForm.secret}
                  onChange={e => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder={t('webhook_modal_secret_placeholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('webhook_modal_label_prefix')}</label>
                <input
                  type="text"
                  value={webhookForm.prefix}
                  onChange={e => setWebhookForm(prev => ({ ...prev, prefix: e.target.value }))}
                  placeholder={t('webhook_modal_prefix_placeholder')}
                />
                <small className="notif-form-hint">
                  {t('webhook_modal_prefix_hint')}
                </small>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWebhookModal(false)}>{t('webhook_modal_cancel')}</button>
              <button className="btn btn-primary" onClick={saveWebhook} disabled={saving}>
                {saving ? t('webhook_modal_saving') : editingWebhook ? t('webhook_modal_save_edit') : t('webhook_modal_save_create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
