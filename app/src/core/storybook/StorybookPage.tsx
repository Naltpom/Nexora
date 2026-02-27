import { Suspense, lazy, useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  labelKey: string
  component: React.LazyExoticComponent<any>
}

const TABS: TabDef[] = [
  { id: 'typography', labelKey: 'tab_typography', component: TypographySection },
  { id: 'buttons', labelKey: 'tab_buttons', component: ButtonsSection },
  { id: 'forms', labelKey: 'tab_forms', component: FormsSection },
  { id: 'cards', labelKey: 'tab_cards', component: CardsModalsSection },
  { id: 'tables', labelKey: 'tab_tables', component: TablesSection },
  { id: 'badges', labelKey: 'tab_badges', component: BadgesSection },
  { id: 'navigation', labelKey: 'tab_navigation', component: NavigationSection },
  { id: 'misc', labelKey: 'tab_misc', component: MiscSection },
]

export default function StorybookPage() {
  const { t } = useTranslation('storybook')
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const initialTab = TABS.find(tab => tab.id === tabParam)?.id || TABS[0].id
  const [activeTab, setActiveTabState] = useState(initialTab)

  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && TABS.find(tab => tab.id === urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab)
    }
  }, [searchParams, activeTab])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabState(tabId)
    setSearchParams({ tab: tabId }, { replace: true })
  }, [setSearchParams])

  const activeTabDef = TABS.find(tab => tab.id === activeTab)
  const ActiveComponent = activeTabDef?.component
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (!tabsRef.current) return
    const tabs = Array.from(tabsRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const currentIndex = tabs.indexOf(e.currentTarget)
    let nextIndex = -1

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    }

    if (nextIndex >= 0) {
      e.preventDefault()
      tabs[nextIndex].focus()
      const tabId = TABS[nextIndex]?.id
      if (tabId) setActiveTab(tabId)
    }
  }, [setActiveTab])

  return (
    <Layout
      breadcrumb={[
        { label: t('breadcrumb_home'), path: '/' },
        { label: t('breadcrumb_admin') },
        { label: t('breadcrumb_storybook') },
      ]}
      title={t('page_title')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('page_title')}</h1>
            <p>{t('page_description')}</p>
          </div>
        </div>
      </div>

      <div className="storybook-tabs" role="tablist" aria-label={t('aria_tablist')} ref={tabsRef}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`storybook-tab${activeTab === tab.id ? ' storybook-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
            type="button"
            role="tab"
            id={`storybook-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`storybook-tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="storybook-tabs-mobile">
        <select
          className="storybook-tabs-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          aria-label={t('aria_tablist')}
        >
          {TABS.map(tab => (
            <option key={tab.id} value={tab.id}>{t(tab.labelKey)}</option>
          ))}
        </select>
      </div>

      <div
        className="unified-card storybook-content"
        role="tabpanel"
        id={`storybook-tabpanel-${activeTab}`}
        aria-labelledby={`storybook-tab-${activeTab}`}
        tabIndex={0}
      >
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
