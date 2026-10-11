import type { Insets } from 'react-native';

/** Minimum touch target per platform guidance (44×44 pt). */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Caps Dynamic Type so dense inbox rows stay usable while still scaling.
 * Individual screens may override via `maxFontSizeMultiplier`.
 */
export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.4;

/** Extra draw distance (dp) for FlashList recycling under burst. */
export const THREAD_LIST_DRAW_DISTANCE = 280;

export function minimumHitSlop(width: number, height: number): Insets {
  const horizontal = Math.max(0, (MIN_TOUCH_TARGET_SIZE - width) / 2);
  const vertical = Math.max(0, (MIN_TOUCH_TARGET_SIZE - height) / 2);

  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

export const a11yRoles = {
  header: 'header' as const,
  button: 'button' as const,
  link: 'link' as const,
};
