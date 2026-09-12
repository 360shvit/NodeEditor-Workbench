import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface WorkbenchSplitterProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  shiftMultiplier?: number;
  label: string;
  orientation?: 'vertical' | 'horizontal';
  pointerValue?: (event: ReactPointerEvent<HTMLDivElement>) => number;
  onChange: (value: number) => void;
  onCommit: (value: number, source: 'pointer' | 'keyboard') => void;
}

function clamp(value: number, min: number, max: number): number {
  const precision = Math.abs(max - min) <= 1 ? 1000 : 1;
  return Math.round(Math.min(max, Math.max(min, value)) * precision) / precision;
}

export function WorkbenchSplitter({
  value,
  min,
  max,
  step = 16,
  shiftMultiplier = 4,
  label,
  orientation = 'vertical',
  pointerValue,
  onChange,
  onCommit,
}: WorkbenchSplitterProps) {
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startValue: number;
    currentValue: number;
  }>();

  const updatePointerValue = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const raw = pointerValue
      ? pointerValue(event)
      : orientation === 'vertical'
        ? drag.startValue + event.clientX - drag.startClientX
        : drag.startValue + event.clientY - drag.startClientY;
    const next = clamp(raw, min, max);
    drag.currentValue = next;
    onChange(next);
  };

  return (
    <div
      className={`workbench-splitter workbench-splitter-${orientation}`}
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startValue: value,
          currentValue: value,
        };
        event.currentTarget.dataset.dragging = 'true';
      }}
      onPointerMove={(event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        updatePointerValue(event);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        updatePointerValue(event);
        const committed = drag.currentValue;
        dragRef.current = undefined;
        event.currentTarget.dataset.dragging = 'false';
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit(committed, 'pointer');
      }}
      onPointerCancel={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const committed = drag.currentValue;
        dragRef.current = undefined;
        event.currentTarget.dataset.dragging = 'false';
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit(committed, 'pointer');
      }}
      onKeyDown={(event) => {
        let next: number | undefined;
        const delta = event.shiftKey ? step * shiftMultiplier : step;
        if (orientation === 'vertical') {
          if (event.key === 'ArrowLeft') next = value - delta;
          if (event.key === 'ArrowRight') next = value + delta;
        } else {
          if (event.key === 'ArrowUp') next = value - delta;
          if (event.key === 'ArrowDown') next = value + delta;
        }
        if (event.key === 'Home') next = min;
        if (event.key === 'End') next = max;
        if (next === undefined) return;
        event.preventDefault();
        const clamped = clamp(next, min, max);
        onChange(clamped);
        onCommit(clamped, 'keyboard');
      }}
    >
      <span aria-hidden="true" />
    </div>
  );
}
