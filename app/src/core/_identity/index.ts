export const manifest = {
  name: '_identity',
  navItems: [
    { label: 'Mon profil', path: '/profile', icon: 'user', section: 'user', order: 10 },
    { label: 'Utilisateurs', path: '/admin/users', icon: 'users', section: 'admin', adminGroup: 'gestion', permission: 'users.read', order: 10 },
    { label: 'Roles', path: '/admin/roles', icon: 'shield', section: 'admin', adminGroup: 'gestion', permission: 'roles.read', order: 20 },
    { label: 'Permissions', path: '/admin/permissions', icon: 'lock', section: 'admin', adminGroup: 'gestion', permission: 'permissions.read', order: 30 },
    { label: 'Features', path: '/admin/features', icon: 'grid', section: 'admin', adminGroup: 'systeme', permission: 'features.read', order: 10 },
    { label: 'Parametres', path: '/admin/settings', icon: 'sliders', section: 'admin', adminGroup: 'systeme', permission: 'settings.read', order: 20 },
    { label: 'Base de donnees', path: '/admin/database', icon: 'database', section: 'admin', adminGroup: 'systeme', permission: 'backups.read', order: 30 },
    { label: 'Commandes', path: '/admin/commands', icon: 'terminal', section: 'admin', adminGroup: 'systeme', permission: 'commands.read', order: 40 },
  ],
}
