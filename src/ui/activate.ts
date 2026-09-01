import type { KeyboardEvent } from 'react';

/**
 * Keyboard activation for controls that are not — and should not become — buttons.
 *
 * A row in a table and a group in an SVG carry semantics a screen reader needs: which
 * row this is, which cells it holds, what the graphic is. Turning them into buttons to
 * make them clickable throws that away. What they are actually missing is narrower: a
 * place in the tab order, and a response to the two keys that activate a control.
 *
 * Space scrolls the page by default and Enter submits an enclosing form, so both are
 * suppressed once they have been handled here.
 */
export function activatable(onActivate: () => void) {
  return {
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      // Only the element itself — a key pressed on something focusable inside it is
      // that control's business, not the row's.
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onActivate();
    },
  };
}
