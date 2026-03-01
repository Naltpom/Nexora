export function formatSize(bytes: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (bytes < 1024) return t('file_size_bytes', { size: bytes })
  if (bytes < 1024 * 1024) return t('file_size_kb', { size: (bytes / 1024).toFixed(1) })
  if (bytes < 1024 * 1024 * 1024) return t('file_size_mb', { size: (bytes / (1024 * 1024)).toFixed(1) })
  return t('file_size_gb', { size: (bytes / (1024 * 1024 * 1024)).toFixed(1) })
}
