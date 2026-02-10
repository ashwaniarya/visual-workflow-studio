import { defineStore } from 'pinia'
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from '../config/themePreferenceConstants'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedThemeMode = 'light' | 'dark'

interface ThemePreferenceState {
  selectedThemeMode: ThemeMode
  resolvedThemeMode: ResolvedThemeMode
}

const systemThemeMediaQuery = '(prefers-color-scheme: dark)'

export const useThemePreferenceStore = defineStore('themePreference', {
  state: (): ThemePreferenceState => ({
    selectedThemeMode: DEFAULT_THEME_MODE,
    resolvedThemeMode: 'dark',
  }),

  actions: {
    initializeThemePreference() {
      const persistedThemeMode = this.readThemeModeFromStorage()
      this.selectedThemeMode = persistedThemeMode
      this.resolvedThemeMode = this.resolveThemeMode(persistedThemeMode)
      this.applyThemeModeToDocument()

      if (typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia(systemThemeMediaQuery)
        mediaQuery.addEventListener('change', () => this.handleSystemThemeChange())
      }
    },

    setThemeMode(themeMode: ThemeMode) {
      this.selectedThemeMode = themeMode
      this.resolvedThemeMode = this.resolveThemeMode(themeMode)
      this.persistThemeMode(themeMode)
      this.applyThemeModeToDocument()
    },

    toggleThemeMode() {
      const nextThemeMode =
        this.resolvedThemeMode === 'dark' ? ('light' as const) : ('dark' as const)
      this.setThemeMode(nextThemeMode)
    },

    applyThemeModeToDocument() {
      if (typeof document === 'undefined') {
        return
      }

      document.documentElement.setAttribute('data-theme', this.resolvedThemeMode)
    },

    resolveThemeMode(themeMode: ThemeMode): ResolvedThemeMode {
      if (themeMode === 'system') {
        if (typeof window === 'undefined') {
          return 'dark'
        }

        return window.matchMedia(systemThemeMediaQuery).matches ? 'dark' : 'light'
      }

      return themeMode
    },

    readThemeModeFromStorage(): ThemeMode {
      if (typeof window === 'undefined') {
        return DEFAULT_THEME_MODE
      }

      const persistedThemeMode = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (persistedThemeMode === 'light' || persistedThemeMode === 'dark' || persistedThemeMode === 'system') {
        return persistedThemeMode
      }

      return DEFAULT_THEME_MODE
    },

    persistThemeMode(themeMode: ThemeMode) {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    },

    handleSystemThemeChange() {
      if (this.selectedThemeMode !== 'system') {
        return
      }

      this.resolvedThemeMode = this.resolveThemeMode('system')
      this.applyThemeModeToDocument()
    },
  },
})
