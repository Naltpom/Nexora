import { lazy } from 'react'

export const manifest = {
  name: 'comments',
  routes: [
    {
      path: '/admin/comments',
      component: lazy(() => import('./CommentsAdminPage')),
      permission: 'comments.moderate',
    },
    {
      path: '/admin/comments/policies',
      component: lazy(() => import('./CommentPoliciesPage')),
      permission: 'comments.policies',
    },
  ],
  navItems: [
    { label: 'Moderation', labelKey: 'comments:admin_breadcrumb', path: '/admin/comments', icon: 'message-circle', section: 'admin', adminGroup: 'contenu', permission: 'comments.moderate', order: 30, exact: true },
    { label: 'Politiques', labelKey: 'comments:policies_breadcrumb', path: '/admin/comments/policies', icon: 'shield', section: 'admin', adminGroup: 'contenu', permission: 'comments.policies', order: 31 },
  ],
}

export { default as CommentSection } from './CommentSection'
