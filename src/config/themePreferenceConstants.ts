export const THEME_STORAGE_KEY = 'visual-workflow-theme-mode'

export const DEFAULT_THEME_MODE = 'system' as const

export const RESPONSIVE_BREAKPOINT_VALUES = {
  mobileMaximumWidth: 767,
  tabletMaximumWidth: 1023,
} as const

export const CONTROL_SIZE_VALUES = {
  smallHeightPx: 30,
  mediumHeightPx: 36,
  largeHeightPx: 42,
} as const

export const SURFACE_RADIUS_VALUES = {
  smallPx: 6,
  mediumPx: 8,
  largePx: 12,
} as const

export const ELEVATION_LEVEL_VALUES = {
  level0: 'none',
  level1: '0 2px 8px rgba(0, 0, 0, 0.18)',
  level2: '0 8px 24px rgba(0, 0, 0, 0.24)',
} as const
