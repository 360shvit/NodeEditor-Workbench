import { useEffect, useRef, useState } from 'react';

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

interface TooltipState {
  text: string;
  rect: DOMRect;
  side: TooltipSide;
  immediate: boolean;
}

const VIEWPORT_GAP = 8;
const TOOLTIP_GAP = 9;
const HOVER_DELAY_MS = 180;

function tooltipTarget(target: EventTarget | null): HTMLElement | undefined {
  if (!(target instanceof Element)) return undefined;
  const element = target.closest<HTMLElement>('[data-tooltip]');
  const text = element?.dataset.tooltip?.trim();
  return element && text ? element : undefined;
}

function tooltipSide(element: HTMLElement): TooltipSide {
  const value = element.dataset.tooltipSide;
  return value === 'right' || value === 'bottom' || value === 'left' ? value : 'top';
}

export function UniversalTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>();
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>();
  const currentTarget = useRef<HTMLElement>();

  useEffect(() => {
    const clearTimer = () => {
      if (hoverTimer.current !== undefined) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = undefined;
      }
    };

    const hide = (target?: HTMLElement) => {
      if (target && currentTarget.current !== target) return;
      clearTimer();
      currentTarget.current = undefined;
      setTooltip(undefined);
    };

    const show = (element: HTMLElement, immediate: boolean) => {
      clearTimer();
      currentTarget.current = element;
      const commit = () => {
        if (currentTarget.current !== element || !element.isConnected) return;
        const text = element.dataset.tooltip?.trim();
        if (!text) return;
        setPosition(undefined);
        setTooltip({ text, rect: element.getBoundingClientRect(), side: tooltipSide(element), immediate });
      };
      if (immediate) commit();
      else hoverTimer.current = window.setTimeout(commit, HOVER_DELAY_MS);
    };

    const onPointerOver = (event: PointerEvent) => {
      const element = tooltipTarget(event.target);
      if (!element || element === currentTarget.current) return;
      show(element, false);
    };
    const onPointerOut = (event: PointerEvent) => {
      const element = tooltipTarget(event.target);
      if (!element) return;
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : undefined;
      if (related && element.contains(related)) return;
      hide(element);
    };
    const onFocusIn = (event: FocusEvent) => {
      const element = tooltipTarget(event.target);
      if (element) show(element, true);
    };
    const onFocusOut = (event: FocusEvent) => {
      const element = tooltipTarget(event.target);
      if (!element) return;
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : undefined;
      if (related && element.contains(related)) return;
      hide(element);
    };
    const onPointerDown = () => hide();
    const onViewportChange = () => hide();

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      clearTimer();
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, []);

  useEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const box = tooltipRef.current.getBoundingClientRect();
    const anchor = tooltip.rect;
    let left = anchor.left + (anchor.width - box.width) / 2;
    let top = anchor.top - box.height - TOOLTIP_GAP;

    if (tooltip.side === 'right') {
      left = anchor.right + TOOLTIP_GAP;
      top = anchor.top + (anchor.height - box.height) / 2;
    } else if (tooltip.side === 'bottom') {
      left = anchor.left + (anchor.width - box.width) / 2;
      top = anchor.bottom + TOOLTIP_GAP;
    } else if (tooltip.side === 'left') {
      left = anchor.left - box.width - TOOLTIP_GAP;
      top = anchor.top + (anchor.height - box.height) / 2;
    }

    if (tooltip.side === 'top' && top < VIEWPORT_GAP) top = anchor.bottom + TOOLTIP_GAP;
    if (tooltip.side === 'bottom' && top + box.height > window.innerHeight - VIEWPORT_GAP) top = anchor.top - box.height - TOOLTIP_GAP;
    if (tooltip.side === 'right' && left + box.width > window.innerWidth - VIEWPORT_GAP) left = anchor.left - box.width - TOOLTIP_GAP;
    if (tooltip.side === 'left' && left < VIEWPORT_GAP) left = anchor.right + TOOLTIP_GAP;

    left = Math.max(VIEWPORT_GAP, Math.min(left, window.innerWidth - box.width - VIEWPORT_GAP));
    top = Math.max(VIEWPORT_GAP, Math.min(top, window.innerHeight - box.height - VIEWPORT_GAP));
    setPosition({ left: Math.round(left), top: Math.round(top) });
  }, [tooltip]);

  if (!tooltip) return null;
  return (
    <div
      ref={tooltipRef}
      className={`universal-tooltip ${tooltip.immediate ? 'is-focus' : ''}`}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' }}
      role="tooltip"
    >
      {tooltip.text}
    </div>
  );
}
