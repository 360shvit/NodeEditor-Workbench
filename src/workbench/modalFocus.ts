import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.hidden) return false;
    return element.getClientRects().length > 0 || element === document.activeElement;
  });
}

export function useModalFocusTrap({
  containerRef,
  initialFocusRef,
  onEscape,
  enabled = true,
}: {
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  enabled?: boolean;
}) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const target = initialFocusRef?.current ?? focusableElements(container)[0] ?? container;
      target.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;
      if (event.key === 'Escape' && escapeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements(container);
      if (!focusable.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const current = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      const currentIndex = current ? focusable.indexOf(current) : -1;
      if (event.shiftKey && (currentIndex <= 0 || !current || !container.contains(current))) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && (currentIndex === focusable.length - 1 || !current || !container.contains(current))) {
        event.preventDefault();
        focusable[0].focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [containerRef, enabled, initialFocusRef]);
}
