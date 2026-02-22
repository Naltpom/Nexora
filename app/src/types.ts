export interface PendingLegalAcceptance {
  slug: string
  title: string
  version: number
  updated_at: string
  content_html: string
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  auth_source: string
  is_active: boolean
  is_super_admin: boolean
  must_change_password: boolean
  preferences?: Record<string, any>
  last_login?: string | null
  last_active?: string | null
  created_at: string
  pending_legal_acceptances?: PendingLegalAcceptance[]
  has_previous_acceptances?: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface FeatureManifest {
  name: string
  label: string
  description: string
  parent: string | null
  children: string[]
  depends: string[]
  permissions: string[]
  is_core: boolean
  active: boolean
  has_routes: boolean
}

export interface Role {
  id: number
  slug: string
  name: string
  description: string | null
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  code: string
  feature: string
  label: string | null
  description: string | null
}

export interface TutorialStep {
  target: string
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  navigateTo?: string
  delay?: number
}

export interface PermissionTutorial {
  permission: string
  label: string
  description?: string
  steps: TutorialStep[]
}

export interface FeatureTutorial {
  featureName: string
  label: string
  description?: string
  permissionTutorials: PermissionTutorial[]
}

export interface TutorialOrdering {
  feature_order: string[]
  permission_order: Record<string, string[]>
}
