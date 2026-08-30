import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  /** The explanation itself. Kept short — this is a margin note, not a paragraph. */
  text: string;
  /** Accessible name for the trigger, e.g. "شرح: خطة الموجة". */
  label: string;
}

const GAP = 8;
const MARGIN = 10;

/**
 * The small ⓘ next to a title. Hovering or focusing it opens the explanation in
 * a floating box, so the screens carry their reasoning without spending a
 * paragraph of vertical space on it in front of people who already know it.
 *
 * The box is positioned as `fixed` and measured against the viewport rather
 * than nested in the flow: panels clip their content with `overflow: hidden`,
 * and a tooltip that opens from a panel header has to survive that. It also
 * has to survive being near an edge, so it flips above the trigger when there
 * is no room below and slides along the inline axis to stay on screen.
 */
export function InfoTip({ text, label }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const box = boxRef.current;
    if (!trigger || !box) return;

    const anchor = trigger.getBoundingClientRect();
    const { width, height } = box.getBoundingClientRect();

    // Below the trigger by default; above it when the viewport bottom is closer
    // than the box is tall.
    const below = anchor.bottom + GAP;
    const top = below + height > window.innerHeight - MARGIN ? anchor.top - GAP - height : below;

    // Centre on the trigger, then pull back inside whichever edge it crosses.
    const centred = anchor.left + anchor.width / 2 - width / 2;
    const left = Math.min(Math.max(centred, MARGIN), window.innerWidth - width - MARGIN);

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Scrolling or resizing moves the trigger out from under a fixed box, so
    // the box goes away rather than pointing at nothing.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="infotip">
      <button
        ref={triggerRef}
        type="button"
        className="infotip-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((was) => !was)}
      >
        i
      </button>
      {open && (
        <div
          ref={boxRef}
          id={id}
          role="tooltip"
          className="infotip-box"
          // Rendered off-screen for the first paint so it can be measured
          // before it is placed; without this it flashes at 0,0.
          style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
