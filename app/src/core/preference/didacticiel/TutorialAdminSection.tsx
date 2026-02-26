import { useState, useEffect, useCallback, DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermission } from '../../PermissionContext'
import { useTutorial } from './TutorialContext'
import api from '../../../api'
import type { TutorialOrdering } from '../../../types'
import './didacticiel.scss'

export default function TutorialAdminSection() {
  const { t } = useTranslation('preference.didacticiel')
  const { can } = usePermission()
  const { featureTutorials } = useTutorial()

  const [featureOrder, setFeatureOrder] = useState<string[]>([])
  const [permissionOrder, setPermissionOrder] = useState<Record<string, string[]>>({})
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())
  const [dragFeatureIdx, setDragFeatureIdx] = useState<number | null>(null)
  const [dragOverFeatureIdx, setDragOverFeatureIdx] = useState<number | null>(null)
  const [dragSubKey, setDragSubKey] = useState<string | null>(null)
  const [dragSubIdx, setDragSubIdx] = useState<number | null>(null)
  const [dragOverSubIdx, setDragOverSubIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Initialize order from available tutorials
  useEffect(() => {
    api
      .get<TutorialOrdering>('/preference/didacticiel/ordering')
      .then((res) => {
        const data = res.data
        // Merge with current feature tutorials (may have new features not in saved order)
        const existingOrder = data.feature_order || []
        const allFeatures = featureTutorials.map((ft) => ft.featureName)
        const merged = [
          ...existingOrder.filter((f) => allFeatures.includes(f)),
          ...allFeatures.filter((f) => !existingOrder.includes(f)),
        ]
        setFeatureOrder(merged)

        const permOrd: Record<string, string[]> = {}
        for (const ft of featureTutorials) {
          const saved = data.permission_order?.[ft.featureName] || []
          const allPerms = ft.permissionTutorials.map((pt) => pt.permission)
          permOrd[ft.featureName] = [
            ...saved.filter((p) => allPerms.includes(p)),
            ...allPerms.filter((p) => !saved.includes(p)),
          ]
        }
        setPermissionOrder(permOrd)
      })
      .catch(() => {
        setFeatureOrder(featureTutorials.map((ft) => ft.featureName))
        const permOrd: Record<string, string[]> = {}
        for (const ft of featureTutorials) {
          permOrd[ft.featureName] = ft.permissionTutorials.map((pt) => pt.permission)
        }
        setPermissionOrder(permOrd)
      })
  }, [featureTutorials])

  const toggleExpand = (name: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // Feature drag handlers
  const onFeatureDragStart = (idx: number) => (e: DragEvent) => {
    setDragFeatureIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onFeatureDragOver = (idx: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragFeatureIdx !== null) setDragOverFeatureIdx(idx)
  }

  const onFeatureDrop = (idx: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragFeatureIdx === null || dragFeatureIdx === idx) return
    setFeatureOrder((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragFeatureIdx, 1)
      next.splice(idx, 0, moved)
      return next
    })
    setDirty(true)
    setDragFeatureIdx(null)
    setDragOverFeatureIdx(null)
  }

  const onFeatureDragEnd = () => {
    setDragFeatureIdx(null)
    setDragOverFeatureIdx(null)
  }

  // Permission drag handlers
  const onPermDragStart = (featureName: string, idx: number) => (e: DragEvent) => {
    e.stopPropagation()
    setDragSubKey(featureName)
    setDragSubIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onPermDragOver = (idx: number) => (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragSubIdx !== null) setDragOverSubIdx(idx)
  }

  const onPermDrop = (featureName: string, idx: number) => (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragSubKey !== featureName || dragSubIdx === null || dragSubIdx === idx) return
    setPermissionOrder((prev) => {
      const list = [...(prev[featureName] || [])]
      const [moved] = list.splice(dragSubIdx, 1)
      list.splice(idx, 0, moved)
      return { ...prev, [featureName]: list }
    })
    setDirty(true)
    setDragSubKey(null)
    setDragSubIdx(null)
    setDragOverSubIdx(null)
  }

  const onPermDragEnd = () => {
    setDragSubKey(null)
    setDragSubIdx(null)
    setDragOverSubIdx(null)
  }

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await api.put('/preference/didacticiel/ordering', {
        feature_order: featureOrder,
        permission_order: permissionOrder,
      })
      setDirty(false)
    } catch {
      // Silently fail
    }
    setSaving(false)
  }, [featureOrder, permissionOrder])

  if (!can('preference.didacticiel.manage')) return null

  const getFeatureLabel = (name: string) => {
    const ft = featureTutorials.find((f) => f.featureName === name)
    return ft?.label || name
  }

  const getPermLabel = (featureName: string, permission: string) => {
    const ft = featureTutorials.find((f) => f.featureName === featureName)
    const pt = ft?.permissionTutorials.find((p) => p.permission === permission)
    return pt?.label || permission
  }

  return (
    <div className="unified-card card-padded tutorial-admin-section">
      <h2 className="title-sm">{t('tutorial_admin_title')}</h2>
      <p className="text-secondary">
        {t('tutorial_admin_description')}
      </p>

      <div className="tutorial-admin__list">
        {featureOrder.map((featureName, fIdx) => {
          const isExpanded = expandedFeatures.has(featureName)
          const perms = permissionOrder[featureName] || []

          return (
            <div key={featureName}>
              <div
                className={`tutorial-admin__item${dragOverFeatureIdx === fIdx ? ' tutorial-admin__item--drag-over' : ''}`}
                draggable
                onDragStart={onFeatureDragStart(fIdx)}
                onDragOver={onFeatureDragOver(fIdx)}
                onDrop={onFeatureDrop(fIdx)}
                onDragEnd={onFeatureDragEnd}
              >
                <span className="tutorial-admin__drag-handle">&#9776;</span>
                <span className="tutorial-admin__item-label">
                  {getFeatureLabel(featureName)}
                </span>
                {perms.length > 1 && (
                  <button
                    className={`tutorial-admin__item-expand${isExpanded ? ' tutorial-admin__item-expand--open' : ''}`}
                    type="button"
                    onClick={() => toggleExpand(featureName)}
                  >
                    &#9654;
                  </button>
                )}
              </div>

              {isExpanded && perms.length > 1 && (
                <div className="tutorial-admin__sub-list">
                  {perms.map((perm, pIdx) => (
                    <div
                      key={perm}
                      className={`tutorial-admin__sub-item${dragSubKey === featureName && dragOverSubIdx === pIdx ? ' tutorial-admin__sub-item--drag-over' : ''}`}
                      draggable
                      onDragStart={onPermDragStart(featureName, pIdx)}
                      onDragOver={onPermDragOver(pIdx)}
                      onDrop={onPermDrop(featureName, pIdx)}
                      onDragEnd={onPermDragEnd}
                    >
                      <span className="tutorial-admin__sub-handle">&#9776;</span>
                      <span className="tutorial-admin__sub-label">
                        {getPermLabel(featureName, perm)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {dirty && (
        <div className="tutorial-admin__footer">
          <button
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving}
            type="button"
          >
            {saving ? t('tutorial_admin_saving') : t('tutorial_admin_save')}
          </button>
        </div>
      )}
    </div>
  )
}
