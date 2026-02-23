export type NavSection = 'user' | 'admin'
export type AdminGroup = 'gestion' | 'systeme' | 'securite'

export interface NavItem {
  label: string
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
