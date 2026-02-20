import { ReactNode, useEffect, Suspense, lazy } from 'react'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import ImpersonationBanner from './ImpersonationBanner'
import { useFeature } from './FeatureContext'

const MFASetupBanner = lazy(() => import('./mfa/MFASetupBanner'))

interface BreadcrumbItem {
  label: string
  path?: string
}

interface Props {
  children: ReactNode
  breadcrumb?: BreadcrumbItem[]
  fullWidth?: boolean
  title?: string
}

export default function Layout({ children, breadcrumb, fullWidth, title }: Props) {
  const { isActive } = useFeature()

  useEffect(() => {
    document.title = title ? `${title} | Kertios Support` : 'Kertios Support'
    return () => { document.title = 'Kertios Support' }
  }, [title])

  return (
    <div className="layout">
      <Header />
      <ImpersonationBanner />
      {isActive('mfa') && (
        <Suspense fallback={null}>
          <MFASetupBanner />
        </Suspense>
      )}
      <main className={`main-content${fullWidth ? ' main-content-full' : ''}`}>
        {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
        {children}
      </main>
    </div>
  )
}
