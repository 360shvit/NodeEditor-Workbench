import { useState } from 'react';
import { useWorkbenchStore } from '../store';
import { WorkbenchDrawer } from './WorkbenchDrawer';

export function RenameRulesPanel() {
  const rules = useWorkbenchStore((state) => state.changeSet.rules);
  const removeRule = useWorkbenchStore((state) => state.removeRule);
  const [open, setOpen] = useState(false);
  if (!rules.length) return null;
  return (
    <>
      <button className="rules-button" onClick={() => setOpen(true)}>{rules.length} active rule{rules.length === 1 ? '' : 's'}</button>
      {open && (
        <WorkbenchDrawer
          title="Active refactor rules"
          subtitle="Remembered old → new mappings"
          onClose={() => setOpen(false)}
          ariaLabel="refactor rules"
          className="rules-drawer"
        >
          <div className="drawer-section">
            {rules.map((rule) => (
              <div className="rule-row" key={rule.id}>
                <span className="field-category">{rule.kind}</span>
                <strong>{rule.symbolType ?? rule.nodeKind ?? rule.field ?? 'value'}</strong>
                <div><code>{String(rule.oldValue)}</code><span>→</span><code>{String(rule.newValue)}</code></div>
                <button onClick={() => removeRule(rule.id)}>Remove rule</button>
              </div>
            ))}
          </div>
        </WorkbenchDrawer>
      )}
    </>
  );
}
