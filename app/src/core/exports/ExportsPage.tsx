import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import api from '../../api'
import Layout from '../Layout'
import { usePermission } from '../PermissionContext'
import ExportCard from './ExportCard'
import { useAvailableExports } from './useAvailableExports'
import './exports.scss'

interface OcInfo {
  id: number
  uuid: string
  name: string
}

export default function ExportsPage() {
  const { t } = useTranslation('exports')
  const { t: tCommon } = useTranslation('common')
  const { getGrant } = usePermission()
  const { grouped, hasOcScoped, exports: allExports } = useAvailableExports()
  const [searchParams, setSearchParams] = useSearchParams()

  const [ocs, setOcs] = useState<OcInfo[]>([])
  const [selectedOcId, setSelectedOcId] = useState<number | undefined>()

  // Handle ?e=uuid query param: find which export it belongs to
  const entryUuid = searchParams.get('e') || null
  const [autoOpenExportId, setAutoOpenExportId] = useState<string | null>(null)

  // Look up the history entry to determine which export_id it belongs to
  useEffect(() => {
    if (!entryUuid) {
      setAutoOpenExportId(null)
      return
    }
    // Fetch recent history entries and find the one matching the UUID
    api.get('/exports/history', {
      params: { page: 1, per_page: 100 },
    }).then(res => {
      const items = res.data.items || []
      const match = items.find((it: any) => it.uuid === entryUuid)
      if (match) {
        setAutoOpenExportId(match.export_id)
      } else {
        setAutoOpenExportId(null)
      }
    }).catch(() => {
      setAutoOpenExportId(null)
    })
  }, [entryUuid])

  const handleModalClose = useCallback(() => {
    // Clear the ?e= param when modal closes
    if (searchParams.has('e')) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('e')
      setSearchParams(newParams, { replace: true })
    }
    setAutoOpenExportId(null)
  }, [searchParams, setSearchParams])

  // Check if user has global permission for any OC-scoped export
  const hasGlobalOcPermission = useMemo(() => {
    for (const exp of allExports) {
      if (exp.scopeType !== 'oc') continue
      const grant = getGrant(exp.permission)
      if (grant?.is_global) return true
    }
    return false
  }, [allExports, getGrant])

  // Load OC list
  useEffect(() => {
    if (!hasOcScoped) return

    api.get('/auth/me/memberships').then(res => {
      const ocList: OcInfo[] = res.data.oc || []
      setOcs(ocList)
      if (ocList.length === 1) {
        setSelectedOcId(ocList[0].id)
      }
    }).catch(() => {
      // silent
    })
  }, [hasOcScoped, hasGlobalOcPermission, allExports, getGrant])

  const selectedOc = ocs.find(oc => oc.id === selectedOcId)
  const featureNames = Object.keys(grouped)

  const breadcrumb = [
    { label: tCommon('home'), path: '/' },
    { label: t('page_title') },
  ]

  return (
    <Layout breadcrumb={breadcrumb} title={t('page_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('page_title')}</h1>
            <p>{t('page_subtitle')}</p>
          </div>
          {hasOcScoped && ocs.length > 1 && (
            <div className="exports-oc-selector">
              <label className="exports-oc-label">{t('select_oc')}</label>
              <select
                className="list-filter-select"
                value={selectedOcId || ''}
                onChange={e => {
                  setSelectedOcId(e.target.value ? Number(e.target.value) : undefined)
                }}
              >
                {[
                  <option key="__empty__" value="">{hasGlobalOcPermission ? t('select_oc_all') : t('select_oc_placeholder')}</option>,
                  ...ocs.map(oc => (
                    <option key={`oc-${oc.id}`} value={oc.id}>{oc.name}</option>
                  )),
                ]}
              </select>
            </div>
          )}
          {hasOcScoped && ocs.length === 1 && (
            <div className="exports-oc-info">
              <span className="exports-oc-label">{t('select_oc')} :</span>
              <strong>{ocs[0].name}</strong>
            </div>
          )}
        </div>
      </div>

      {allExports.length === 0 && (
        <div className="unified-card">
          <div className="table-no-match">{t('no_exports')}</div>
        </div>
      )}

      {featureNames.map(featureName => {
        const featureExports = grouped[featureName]
        const featureLabel = featureExports[0]?.featureLabel || featureName

        const needsOc = featureExports.some(e => e.scopeType === 'oc')
        const ocReady = !needsOc || hasGlobalOcPermission || !!selectedOcId

        return (
          <div key={featureName} className="exports-section">
            <h2 className="exports-section-title">
              <FeatureLabel labelKey={featureLabel} fallback={featureName} />
            </h2>

            {needsOc && !ocReady && (
              <p className="exports-scope-hint">{t('select_scope_first')}</p>
            )}

            {ocReady && (
              <div className="exports-cards">
                {featureExports.map(exp => (
                  <ExportCard
                    key={exp.id}
                    descriptor={exp}
                    selectedOcId={selectedOcId}
                    selectedOcUuid={selectedOc?.uuid}
                    selectedOcName={selectedOc?.name}
                    autoOpenEntryUuid={autoOpenExportId === exp.id ? (entryUuid || undefined) : undefined}
                    onModalClose={handleModalClose}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </Layout>
  )
}

function FeatureLabel({ labelKey, fallback }: { labelKey: string; fallback: string }) {
  const ns = labelKey.includes(':') ? labelKey.split(':')[0] : undefined
  const key = labelKey.includes(':') ? labelKey.split(':')[1] : labelKey
  const { t } = useTranslation(ns)
  const translated = ns ? t(key) : fallback

  return <>{translated === key ? fallback : translated}</>
}
