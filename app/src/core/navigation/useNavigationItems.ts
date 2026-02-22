import { useMemo } from 'react'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import { usePermission } from '../PermissionContext'
import type { NavItem, AdminGroup } from './types'

const featureModules: Record<string, any> = {
  ...import.meta.glob('../*/index.ts', { eager: true }),
  ...import.meta.glob('../../features/*/index.ts', { eager: true }),
}

const ADMIN_GROUP_ORDER: AdminGroup[] = ['gestion', 'systeme', 'securite']

const ADMIN_GROUP_LABELS: Record<AdminGroup, string> = {
  gestion: 'Gestion',
  systeme: 'Systeme',
  securite: 'Securite & Conformite',
}

const ADMIN_GROUP_ICONS: Record<AdminGroup, string> = {
  gestion: 'users',
  systeme: 'sliders',
  securite: 'shield-check',
}

export interface AdminGroupData {
  key: AdminGroup
  label: string
  icon: string
  items: NavItem[]
}

export function useNavigationItems() {
  const { user } = useAuth()
  const { isActive } = useFeature()
  const { can } = usePermission()

  return useMemo(() => {
    const allItems: NavItem[] = []

    for (const [, mod] of Object.entries(featureModules)) {
      const manifest = (mod as any).manifest
      if (!manifest) continue

      const featureName = manifest.name as string
      if (!isActive(featureName)) continue

      const navItems: NavItem[] = manifest.navItems || []
      for (const item of navItems) {
        if (item.featureGate && !isActive(item.featureGate)) continue
        if (item.requireSuperAdmin && !can('users.read')) continue
        if (item.permission && !can(item.permission)) continue
        allItems.push(item)
      }
    }

    const userItems = allItems
      .filter(i => i.section === 'user')
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))

    const adminItems = allItems.filter(i => i.section === 'admin')

    const adminGroups: AdminGroupData[] = ADMIN_GROUP_ORDER
      .map(key => ({
        key,
        label: ADMIN_GROUP_LABELS[key],
        icon: ADMIN_GROUP_ICONS[key],
        items: adminItems
          .filter(i => i.adminGroup === key)
          .sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
      }))
      .filter(g => g.items.length > 0)

    return { userItems, adminGroups }
  }, [user, isActive, can])
}
