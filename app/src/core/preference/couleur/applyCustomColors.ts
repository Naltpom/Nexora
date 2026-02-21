const COLOR_VARS = [
  'primary', 'primary-light', 'primary-dark',
  'success', 'warning', 'danger',
  'gray-50', 'gray-100', 'gray-200', 'gray-300', 'gray-400',
  'gray-500', 'gray-600', 'gray-700', 'gray-800', 'gray-900',
] as const

export function applyCustomColors(
  customColors: Record<string, Record<string, string>> | null | undefined,
  currentTheme: string
): void {
  const style = document.documentElement.style
  const themeKey = currentTheme === 'dark' ? 'dark' : 'light'
  const colors = customColors?.[themeKey]

  for (const varName of COLOR_VARS) {
    if (colors && colors[varName]) {
      style.setProperty(`--${varName}`, colors[varName])
    } else {
      style.removeProperty(`--${varName}`)
    }
  }
}

export function clearCustomColors(): void {
  const style = document.documentElement.style
  for (const varName of COLOR_VARS) {
    style.removeProperty(`--${varName}`)
  }
}

export { COLOR_VARS }
