// Hell/Dunkel-Umschaltung – bewusst gerätelokal (nicht im geteilten Zustand):
// jedes Handy wählt sein eigenes Erscheinungsbild.

export type Theme = 'light' | 'dark'

const THEME_KEY = 'flunk-des-lebens/theme/v1'

/** Passende Browser-Chrome-Farbe (Adressleiste) je Theme. */
const THEME_COLOR: Record<Theme, string> = {
  light: '#f4f5f7',
  dark: '#141518',
}

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    // ignorieren
  }
  // Ohne gespeicherte Wahl der Systemeinstellung folgen.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignorieren
  }
}
