export type NavSection = 'user' | 'admin' | 'sidebar'
export type AdminGroup = 'gestion' | 'contenu' | 'systeme' | 'securite'

export interface NavItem {
  label: string
  labelKey?: string
  path: string
  icon: string
  section: NavSection
  adminGroup?: AdminGroup
  permission?: string
  requireSuperAdmin?: boolean
  order?: number
  featureGate?: string
  exact?: boolean
}
