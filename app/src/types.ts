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
  version: string
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
