import { ReactNode, useEffect } from 'react'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import ImpersonationBanner from './ImpersonationBanner'

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
  useEffect(() => {
    document.title = title ? `${title} | Kertios Support` : 'Kertios Support'
    return () => { document.title = 'Kertios Support' }
  }, [title])

  return (
    <div className="layout">
      <Header />
      <ImpersonationBanner />
      <main className={`main-content${fullWidth ? ' main-content-full' : ''}`}>
        {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
        {children}
      </main>
    </div>
  )
}
