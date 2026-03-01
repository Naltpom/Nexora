import { lazy } from 'react'

export const manifest = {
  name: 'file_storage',
  routes: [
    {
      path: '/admin/files',
      component: lazy(() => import('./FileStorageAdminPage')),
      permission: 'file_storage.admin',
    },
    {
      path: '/admin/file-policies',
      component: lazy(() => import('./FileStoragePoliciesPage')),
      permission: 'file_storage.policies',
    },
  ],
  navItems: [
    {
      label: 'Fichiers',
      labelKey: 'file_storage:admin_breadcrumb',
      path: '/admin/files',
      icon: 'file',
      section: 'admin',
      adminGroup: 'contenu',
      permission: 'file_storage.admin',
      order: 32,
    },
    {
      label: 'Politiques fichiers',
      labelKey: 'file_storage:policies_breadcrumb',
      path: '/admin/file-policies',
      icon: 'shield',
      section: 'admin',
      adminGroup: 'contenu',
      permission: 'file_storage.policies',
      order: 33,
    },
  ],
}

// Re-export reusable components
export { default as FileUpload } from './FileUpload'
export { default as FileUploadMultiple } from './FileUploadMultiple'
export { default as FilePreview } from './FilePreview'
export { default as FileList } from './FileList'
export { default as QuotaIndicator } from './QuotaIndicator'
export { useFileUpload } from './useFileUpload'
export { useFileList } from './useFileList'
export type { StorageDocument, UploadConfig, QuotaInfo, FileStoragePolicy } from './types'
