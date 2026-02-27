/**
 * Shared password policy validation.
 * Returns an array of i18n keys for violated rules (empty = valid).
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = []
  if (password.length < 8) errors.push('common.password_policy.min_length')
  if (!/[A-Z]/.test(password)) errors.push('common.password_policy.uppercase')
  if (!/\d/.test(password)) errors.push('common.password_policy.digit')
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('common.password_policy.special')
  return errors
}
