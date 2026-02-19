import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../core/Layout'
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
            <th style={{ width: '280px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}><span className="spinner" /></td></tr>
          ) : files.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>{emptyText}</td></tr>
          ) : (
            files.map((b) => (
              <tr key={b.filename}>
                <td><span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{b.filename}</span></td>
                <td><span className={`badge ${b.type === 'dump' ? 'badge-warning' : 'badge-success'}`}>{b.type.toUpperCase()}</span></td>
                <td>{b.size_display}</td>
                <td>{formatDate(b.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget({ filename: b.filename, source })} disabled={isBusy} title="Restaurer cette sauvegarde">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                      Restaurer
                    </button>
                    {source === 'backups' && isDev && (
                      <button className="btn btn-sm" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }} onClick={() => handleCopyToDemo(b.filename)} disabled={isBusy} title="Copier vers les démos">Vers démo</button>
                    )}
                    {source === 'demos' && (
                      <button className="btn btn-sm" style={{ backgroundColor: 'var(--primary-bg, #eff6ff)', color: 'var(--primary, #1E40AF)', border: '1px solid var(--primary, #1E40AF)40' }} onClick={() => handleCopyToInitial(b.filename)} disabled={isBusy} title="Définir comme backup initial">Vers initial</button>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleCreateBackup} disabled={isBusy}>
              {creating ? (<><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sauvegarde en cours...</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Nouvelle sauvegarde</>)}
            </button>
          </div>
        </div>
      </div>

      {activeJob && (
        <div className="card" style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'var(--primary-bg, #eff6ff)', color: 'var(--primary, #1E40AF)', border: '1px solid var(--primary, #1E40AF)20', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          {activeJob.message}
        </div>
      )}

      {message && !activeJob && (
        <div className="card" style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: message.type === 'success' ? 'var(--success-bg, #ecfdf5)' : 'var(--danger-bg, #fef2f2)', color: message.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #DC2626)', border: `1px solid ${message.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #DC2626)'}20` }}>
          {message.text}
        </div>
      )}

      <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Sauvegardes</h2>
      <div className="unified-card card-table" style={{ marginBottom: '24px' }}>
        {renderTable(backups, 'backups', 'Aucune sauvegarde trouvée')}
      </div>

      {isDev && (
        <>
          <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Sauvegardes démo</h2>
          <div className="unified-card card-table">
            {renderTable(demos, 'demos', 'Aucune sauvegarde démo trouvée')}
          </div>
        </>
      )}

      {restoreTarget && (
        <div className="modal-overlay" onClick={() => setRestoreTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Restaurer une sauvegarde</h3>
              <button className="modal-close" onClick={() => setRestoreTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '8px' }}>Fichier : <strong style={{ fontFamily: 'monospace' }}>{restoreTarget.filename}</strong></p>
              <p style={{ marginBottom: '8px' }}>Cette action va <strong>remplacer toutes les données actuelles</strong> par celles de cette sauvegarde.</p>
              <p>Voulez-vous créer une sauvegarde de la base actuelle avant de restaurer ?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setRestoreTarget(null)}>Annuler</button>
              <button className="btn btn-sm" style={{ backgroundColor: 'var(--warning, #D97706)', color: 'white' }} onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, false)}>Restaurer directement</button>
              <button className="btn btn-primary btn-sm" onClick={() => handleRestore(restoreTarget.filename, restoreTarget.source, true)}>Sauvegarder puis restaurer</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
