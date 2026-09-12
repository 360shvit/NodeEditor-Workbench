import { createContext, useContext, type ReactNode } from 'react';
import type { WorkbenchPaneId } from '../store';

const WorkbenchPaneContext = createContext<WorkbenchPaneId>('primary');

export function WorkbenchPaneProvider({ paneId, children }: { paneId: WorkbenchPaneId; children: ReactNode }) {
  return <WorkbenchPaneContext.Provider value={paneId}>{children}</WorkbenchPaneContext.Provider>;
}

export function useWorkbenchPaneId(): WorkbenchPaneId {
  return useContext(WorkbenchPaneContext);
}
