import type { SymbolOccurrence, SymbolRecord } from '../core';
import { WorkbenchDrawer } from './WorkbenchDrawer';

function OccurrenceRow({ item, onOpen }: { item: SymbolOccurrence; onOpen: (item: SymbolOccurrence) => void }) {
  return (
    <button className="reference-row" onClick={() => onOpen(item)}>
      <span>{item.filePath}</span>
      <small>{item.location} · {item.nodeKind} · {item.field}</small>
    </button>
  );
}

export function ReferenceDrawer({ record, onClose, onOpenOccurrence, onOpenAsTab }: {
  record: SymbolRecord;
  onClose: () => void;
  onOpenOccurrence: (item: SymbolOccurrence) => void;
  onOpenAsTab: (record: SymbolRecord) => void;
}) {
  const liveRefs = record.references.filter((item) => item.location === 'live').length;
  const floatingRefs = record.references.length - liveRefs;
  return (
    <WorkbenchDrawer
      title={record.key.name}
      subtitle={`${record.key.symbolType} · ${liveRefs} live refs · ${floatingRefs} floating refs`}
      onClose={onClose}
      ariaLabel="references"
    >
      <div className="drawer-primary-action">
        <button className="primary" onClick={() => onOpenAsTab(record)}>Open all as tab</button>
        <small>Creates a stable reference snapshot using the normal Workbench filters.</small>
      </div>
      <div className="drawer-section">
        <h4>Definitions ({record.definitions.length})</h4>
        {record.definitions.length === 0 && <div className="drawer-empty">No definition in the loaded project.</div>}
        {record.definitions.map((item, index) => <OccurrenceRow key={`d-${index}`} item={item} onOpen={onOpenOccurrence} />)}
      </div>
      <div className="drawer-section">
        <h4>References ({record.references.length})</h4>
        {record.references.length === 0 && <div className="drawer-empty">No references in the loaded project.</div>}
        {record.references.map((item, index) => <OccurrenceRow key={`r-${index}`} item={item} onOpen={onOpenOccurrence} />)}
      </div>
    </WorkbenchDrawer>
  );
}
