import { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../../core/Layout'
import './storybook.scss'

const TypographySection = lazy(() => import('./sections/TypographySection'))
const ButtonsSection = lazy(() => import('./sections/ButtonsSection'))
const FormsSection = lazy(() => import('./sections/FormsSection'))
const CardsModalsSection = lazy(() => import('./sections/CardsModalsSection'))
const TablesSection = lazy(() => import('./sections/TablesSection'))
const BadgesSection = lazy(() => import('./sections/BadgesSection'))
const NavigationSection = lazy(() => import('./sections/NavigationSection'))
const MiscSection = lazy(() => import('./sections/MiscSection'))

interface TabDef {
  id: string
  label: string
  component: React.LazyExoticComponent<any>
}

const TABS: TabDef[] = [
  { id: 'typography', label: 'Typographie', component: TypographySection },
  { id: 'buttons', label: 'Boutons', component: ButtonsSection },
  { id: 'forms', label: 'Formulaires', component: FormsSection },
  { id: 'cards', label: 'Cartes & Modals', component: CardsModalsSection },
  { id: 'tables', label: 'Tableaux', component: TablesSection },
  { id: 'badges', label: 'Badges & Alertes', component: BadgesSection },
  { id: 'navigation', label: 'Navigation', component: NavigationSection },
  { id: 'misc', label: 'Divers', component: MiscSection },
]

export default function StorybookPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const initialTab = TABS.find(t => t.id === tabParam)?.id || TABS[0].id
  const [activeTab, setActiveTabState] = useState(initialTab)

  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && TABS.find(t => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab)
    }
  }, [searchParams])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId)
    setSearchParams({ tab: tabId }, { replace: true })
  }, [setSearchParams])

  const activeTabDef = TABS.find(t => t.id === activeTab)
  const ActiveComponent = activeTabDef?.component

  return (
    <Layout
      breadcrumb={[
        { label: 'Accueil', path: '/' },
        { label: 'Administration' },
        { label: 'Storybook' },
      ]}
      title="Storybook"
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Storybook</h1>
            <p>Catalogue visuel des composants UI de l'application.</p>
          </div>
        </div>
      </div>

      <div className="storybook-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`storybook-tab${activeTab === tab.id ? ' storybook-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="storybook-tabs-mobile">
        <select
          className="storybook-tabs-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          {TABS.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      <div className="unified-card storybook-content">
        <div className="card-body">
          {ActiveComponent && (
            <Suspense fallback={null}>
              <ActiveComponent />
            </Suspense>
          )}
        </div>
      </div>
    </Layout>
  )
}
