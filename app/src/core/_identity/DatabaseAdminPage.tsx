import { useState, useEffect, useCallback, useRef } from 'react'
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
      setMessage({ type: 'error', text: 'Erreur lors du chargement des sauvegardes' })
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
            if (job.backup_created) msg += ` (sauvegarde créée : ${job.backup_created})`
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
        setMessage({ type: 'error', text: 'Erreur lors du suivi de la restauration' })
      }
    }, 2000)
  }, [fetchBackups])

  const handleCreateBackup = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const res = await api.post('/backups')
      setMessage({ type: 'success', text: `Sauvegarde créée : ${res.data.filename}` })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la création de la sauvegarde' })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (filename: string, source: 'backups' | 'demos', createBackupFirst: boolean) => {
    setRestoreTarget(null)
    setMessage(null)
    setActiveJob({ id: '', status: 'running', message: `Lancement de la restauration de ${filename}...` })
    try {
      const res = await api.post('/backups/restore', { filename, source, create_backup_first: createBackupFirst })
      setActiveJob({ id: res.data.job_id, status: 'running', message: `Restauration de ${filename} en cours...`, backup_created: res.data.backup_created })
      pollJob(res.data.job_id)
    } catch {
      setActiveJob(null)
      setMessage({ type: 'error', text: 'Erreur lors du lancement de la restauration' })
    }
  }

  const handleCopyToDemo = async (filename: string) => {
    setMessage(null)
    try {
      await api.post('/backups/copy-to-demo', { filename })
      setMessage({ type: 'success', text: `${filename} copié dans les démos` })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la copie vers les démos' })
    }
  }

  const handleCopyToInitial = async (filename: string) => {
    setMessage(null)
    try {
      await api.post('/backups/copy-to-initial', { filename })
      setMessage({ type: 'success', text: `${filename} défini comme backup initial` })
      await fetchBackups()
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la copie vers le backup initial' })
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
            <th>Fichier</th>
            <th>Type</th>
            <th>Taille</th>
            <th>Date</th>
            <th className="col-actions-wide">Actions</th>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget({ filename: b.filename, source })} disabled={isBusy} title="Restaurer cette sauvegarde">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        Restaurer
                      </button>
                    )}
                    {source === 'backups' && isDev && can('backups.create') && (
                      <button className="btn btn-sm badge-tag db-badge--active" onClick={() => handleCopyToDemo(b.filename)} disabled={isBusy} title="Copier vers les démos">Vers démo</button>
                    )}
                    {source === 'demos' && can('backups.restore') && (
                      <button className="btn btn-sm badge-tag db-badge--highlight" onClick={() => handleCopyToInitial(b.filename)} disabled={isBusy} title="Définir comme backup initial">Vers initial</button>
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
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Base de données' }]} title="Base de données">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Base de données</h1>
            <p>Gérez les sauvegardes et restaurations de la base de données</p>
          </div>
          {can('backups.create') && (
            <div className="flex-row-sm">
              <button className="btn btn-primary" onClick={handleCreateBackup} disabled={isBusy}>
                {creating ? (<><span className="spinner spinner-sm" /> Sauvegarde en cours...</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Nouvelle sauvegarde</>)}
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

      <h2 className="title-sm mb-12">Sauvegardes</h2>
      <div className="unified-card card-table section-mb-lg">
        {renderTable(backups, 'backups', 'Aucune sauvegarde trouvée')}
      </div>

      {isDev && (
        <>
          <h2 className="title-sm mb-12">Sauvegardes démo</h2>
          <div className="unified-card card-table">
            {renderTable(demos, 'demos', 'Aucune sauvegarde démo trouvée')}
          </div>
        </>
      )}

      {restoreTarget && (
        <div className="modal-overlay" onClick={() => setRestoreTarget(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Restaurer une sauvegarde</h3>
              <button className="modal-close" onClick={() => setRestoreTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="mb-8">Fichier : <strong className="text-mono">{restoreTarget.filename}</strong></p>
              <p className="mb-8">Cette action va <strong>remplacer toutes les données actuelles</strong> par celles de cette sauvegarde.</p>
              <p>Voulez-vous créer une sauvegarde de la base actuelle avant de restaurer ?</p>
            </div>
            <div className="modal-footer flex-end flex-row-sm">
              <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget(null)}>Annuler</button>
              {can('backups.restore') && (
                <button className="btn btn-warning btn-sm" onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, false)}>Restaurer directement</button>
              )}
              {can('backups.restore') && (
                <button className="btn btn-primary btn-sm" onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, true)}>Sauvegarder puis restaurer</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
