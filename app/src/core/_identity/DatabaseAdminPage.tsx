import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import Layout from '../../core/Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface BackupFile {
  filename: string
  size: number
  size_display: string
  created_at: string
  type: 'sql' | 'dump'
}

interface Job {
  id: string
  status: 'running' | 'completed' | 'failed'
  message: string
  backup_created?: string
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

const isDev = import.meta.env.VITE_ENV === 'dev'

export default function DatabaseAdminPage() {
  const { t } = useTranslation('_identity')
  const { can } = usePermission()
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [demos, setDemos] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{ filename: string; source: 'backups' | 'demos' } | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get('/backups')
      setBackups(res.data.backups)
      setDemos(res.data.demos)
    } catch {
      setMessage({ type: 'error', text: t('database_admin.error_load') })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBackups() }, [fetchBackups])
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

  const pollJob = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/backups/jobs/${jobId}`)
        const job: Job = res.data
        setActiveJob(job)
        if (job.status !== 'running') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          if (job.status === 'completed') {
            let msg = job.message
            if (job.backup_created) msg += ' ' + t('database_admin.backup_created_suffix', { filename: job.backup_created })
            setMessage({ type: 'success', text: msg })
          } else {
            setMessage({ type: 'error', text: job.message })
          }
          setActiveJob(null)
          await fetchBackups()
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setActiveJob(null)
        setMessage({ type: 'error', text: t('database_admin.error_restore_poll') })
      }
    }, 2000)
  }, [fetchBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const res = await api.post('/backups')
      setMessage({ type: 'success', text: t('database_admin.backup_created', { filename: res.data.filename }) })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: t('database_admin.error_create') })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (filename: string, source: 'backups' | 'demos', createBackupFirst: boolean) => {
    setRestoreTarget(null)
    setMessage(null)
    setActiveJob({ id: '', status: 'running', message: t('database_admin.restore_starting', { filename }) })
    try {
      const res = await api.post('/backups/restore', { filename, source, create_backup_first: createBackupFirst })
      setActiveJob({ id: res.data.job_id, status: 'running', message: t('database_admin.restore_in_progress', { filename }), backup_created: res.data.backup_created })
      pollJob(res.data.job_id)
    } catch {
      setActiveJob(null)
      setMessage({ type: 'error', text: t('database_admin.error_restore_start') })
    }
  }

  const handleCopyToDemo = async (filename: string) => {
    setMessage(null)
    try {
      await api.post('/backups/copy-to-demo', { filename })
      setMessage({ type: 'success', text: t('database_admin.copied_to_demo', { filename }) })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: t('database_admin.error_copy_demo') })
    }
  }

  const handleCopyToInitial = async (filename: string) => {
    setMessage(null)
    try {
      await api.post('/backups/copy-to-initial', { filename })
      setMessage({ type: 'success', text: t('database_admin.set_as_initial', { filename }) })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: t('database_admin.error_copy_initial') })
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const isBusy = creating || !!activeJob

  const renderTable = (files: BackupFile[], source: 'backups' | 'demos', emptyText: string) => (
    <div className="table-container">
      <table className="unified-table">
        <thead>
          <tr>
            <th>{t('database_admin.th_file')}</th>
            <th>{t('database_admin.th_type')}</th>
            <th>{t('database_admin.th_size')}</th>
            <th>{t('database_admin.th_date')}</th>
            <th className="col-actions-wide">{t('database_admin.th_actions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="empty-state-sm"><span className="spinner" /></td></tr>
          ) : files.length === 0 ? (
            <tr><td colSpan={5} className="empty-state-sm">{emptyText}</td></tr>
          ) : (
            files.map((b) => (
              <tr key={b.filename}>
                <td><span className="text-mono">{b.filename}</span></td>
                <td><span className={`badge ${b.type === 'dump' ? 'badge-warning' : 'badge-success'}`}>{b.type.toUpperCase()}</span></td>
                <td>{b.size_display}</td>
                <td>{formatDate(b.created_at)}</td>
                <td>
                  <div className="flex-row-xs">
                    {can('backups.restore') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget({ filename: b.filename, source })} disabled={isBusy} title={t('database_admin.tooltip_restore')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        {t('database_admin.btn_restore')}
                      </button>
                    )}
                    {source === 'backups' && isDev && can('backups.create') && (
                      <button className="btn btn-sm badge-tag db-badge--active" onClick={() => handleCopyToDemo(b.filename)} disabled={isBusy} title={t('database_admin.tooltip_to_demo')}>{t('database_admin.btn_to_demo')}</button>
                    )}
                    {source === 'demos' && can('backups.restore') && (
                      <button className="btn btn-sm badge-tag db-badge--highlight" onClick={() => handleCopyToInitial(b.filename)} disabled={isBusy} title={t('database_admin.tooltip_to_initial')}>{t('database_admin.btn_to_initial')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('database_admin.breadcrumb_database') }]} title={t('database_admin.breadcrumb_database')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('database_admin.page_title')}</h1>
            <p>{t('database_admin.subtitle')}</p>
          </div>
          {can('backups.create') && (
            <div className="flex-row-sm">
              <button className="btn btn-primary" onClick={handleCreateBackup} disabled={isBusy}>
                {creating ? (<><span className="spinner spinner-sm" /> {t('database_admin.btn_backup_in_progress')}</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> {t('database_admin.btn_new_backup')}</>)}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeJob && (
        <div className="alert-dynamic alert-dynamic--info">
          <span className="spinner spinner-md" />
          {activeJob.message}
        </div>
      )}

      {message && !activeJob && (
        <div className={`alert-dynamic ${message.type === 'success' ? 'alert-dynamic--success' : 'alert-dynamic--error'}`}>
          {message.text}
        </div>
      )}

      <h2 className="title-sm mb-12">{t('database_admin.section_backups')}</h2>
      <div className="unified-card card-table section-mb-lg">
        {renderTable(backups, 'backups', t('database_admin.empty_backups'))}
      </div>

      {isDev && (
        <>
          <h2 className="title-sm mb-12">{t('database_admin.section_demo_backups')}</h2>
          <div className="unified-card card-table">
            {renderTable(demos, 'demos', t('database_admin.empty_demo_backups'))}
          </div>
        </>
      )}

      {restoreTarget && (
        <div className="modal-overlay" onClick={() => setRestoreTarget(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('database_admin.modal_restore_title')}</h3>
              <button className="modal-close" onClick={() => setRestoreTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="mb-8">{t('database_admin.modal_restore_file_label')} <strong className="text-mono">{restoreTarget.filename}</strong></p>
              <p className="mb-8">{t('database_admin.modal_restore_warning')}</p>
              <p>{t('database_admin.modal_restore_backup_question')}</p>
            </div>
            <div className="modal-footer flex-end flex-row-sm">
              <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget(null)}>{t('common.cancel')}</button>
              {can('backups.restore') && (
                <button className="btn btn-warning btn-sm" onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, false)}>{t('database_admin.modal_restore_direct')}</button>
              )}
              {can('backups.restore') && (
                <button className="btn btn-primary btn-sm" onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, true)}>{t('database_admin.modal_restore_backup_first')}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
