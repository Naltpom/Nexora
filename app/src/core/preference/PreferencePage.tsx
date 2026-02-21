import { Suspense, lazy, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useFeature } from '../../core/FeatureContext'
import { usePermission } from '../../core/PermissionContext'
import { DraftPreferenceProvider, useDraftPreference } from './DraftPreferenceContext'
import UnsavedChangesModal from './UnsavedChangesModal'
import '../_identity/_identity.scss'
import './preference.scss'
import './preferenceTabs.scss'

const ThemeSection = lazy(() => import('./theme/ThemeSection'))
const ColorSection = lazy(() => import('./couleur/ColorSection'))
const FontSection = lazy(() => import('./font/FontSection'))
const LayoutSection = lazy(() => import('./layout/LayoutSection'))
const ComposantsSection = lazy(() => import('./composants/ComposantsSection'))
const AccessibiliteSection = lazy(() => import('./accessibilite/AccessibiliteSection'))

interface TabDef {
  id: string
  label: string
  feature: string
  permission: string
  component: React.LazyExoticComponent<any>
}

const TABS: TabDef[] = [
  { id: 'theme', label: 'Theme', feature: 'preference.theme', permission: 'preference.theme.read', component: ThemeSection },
  { id: 'couleur', label: 'Couleurs', feature: 'preference.couleur', permission: 'preference.couleur.read', component: ColorSection },
  { id: 'font', label: 'Typographie', feature: 'preference.font', permission: 'preference.font.read', component: FontSection },
  { id: 'layout', label: 'Mise en page', feature: 'preference.layout', permission: 'preference.layout.read', component: LayoutSection },
  { id: 'composants', label: 'Composants', feature: 'preference.composants', permission: 'preference.composants.read', component: ComposantsSection },
  { id: 'accessibilite', label: 'Accessibilite', feature: 'preference.accessibilite', permission: 'preference.accessibilite.read', component: AccessibiliteSection },
]

export default function PreferencePage() {
  return (
    <DraftPreferenceProvider>
      <PreferencePageInner />
    </DraftPreferenceProvider>
  )
}

function PreferencePageInner() {
  const { isActive } = useFeature()
  const { can } = usePermission()
  const { hasChanges, getChanges, saveAll, discardAll } = useDraftPreference()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const hasChangesRef = useRef(hasChanges)
  hasChangesRef.current = hasChanges

  // Pending navigation target when modal is shown
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const visibleTabs = useMemo(
    () => TABS.filter(tab => isActive(tab.feature) && can(tab.permission)),
    [isActive, can],
  )

  // Read initial tab from URL query param
  const tabParam = searchParams.get('tab')
  const initialTab = visibleTabs.find(t => t.id === tabParam)?.id || visibleTabs[0]?.id || ''
  const [activeTab, setActiveTabState] = useState(initialTab)

  // Sync tab from URL when searchParams change (tutorial navigation)
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && visibleTabs.find(t => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId)
    setSearchParams({ tab: tabId }, { replace: true })
  }, [setSearchParams])

  // If current tab is no longer visible, fallback to first
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  // Intercept internal link clicks for navigation blocking
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!hasChangesRef.current) return

      const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return

      // Same page link — ignore
      if (href === location.pathname) return

      e.preventDefault()
      e.stopPropagation()
      setPendingPath(href)
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [location.pathname])

  // Browser tab close / refresh
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const proceedNavigation = useCallback((path: string) => {
    setPendingPath(null)
    navigate(path)
  }, [navigate])

  const handleSaveAndLeave = async () => {
    const path = pendingPath
    await saveAll()
    if (path) proceedNavigation(path)
  }

  const handleDiscardAndLeave = () => {
    const path = pendingPath
    discardAll()
    if (path) proceedNavigation(path)
  }

  const handleCancelNavigation = () => {
    setPendingPath(null)
  }

  const activeTabDef = visibleTabs.find(t => t.id === activeTab)
  const ActiveComponent = activeTabDef?.component

  return (
    <>
      <Layout
        breadcrumb={[
          { label: 'Accueil', path: '/' },
          { label: 'Mon profil', path: '/profile' },
          { label: 'Preferences' },
        ]}
        title="Preferences"
      >
        <div className="unified-card page-header-card">
          <div className="unified-page-header">
            <div className="unified-page-header-info">
              <h1>Preferences</h1>
              <p>Personnalisez votre experience utilisateur.</p>
            </div>
          </div>
        </div>

        {visibleTabs.length > 0 && (
          <>
            <div className="pref-tabs">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`pref-tab${activeTab === tab.id ? ' pref-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pref-tabs-mobile">
              <select
                className="pref-tabs-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                {visibleTabs.map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            </div>

            <div className="pref-tab-content">
              {ActiveComponent && (
                <Suspense fallback={null}>
                  <ActiveComponent />
                </Suspense>
              )}
            </div>
          </>
        )}

        {hasChanges && (
          <div className="pref-save-bar">
            <span className="pref-save-bar__hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Modifications non sauvegardees
            </span>
            <button className="btn btn-secondary" onClick={discardAll} type="button">
              Annuler
            </button>
            <button className="btn btn-primary" onClick={saveAll} type="button">
              Sauvegarder mes preferences
            </button>
          </div>
        )}
      </Layout>

      {pendingPath && (
        <UnsavedChangesModal
          changes={getChanges()}
          onSaveAndLeave={handleSaveAndLeave}
          onDiscardAndLeave={handleDiscardAndLeave}
          onCancel={handleCancelNavigation}
        />
      )}
    </>
  )
}
