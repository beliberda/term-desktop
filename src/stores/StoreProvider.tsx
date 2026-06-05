import type { ReactNode } from 'react';
import { rootStore } from './RootStore';
import { StoreContext } from './context';

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <StoreContext.Provider value={rootStore}>{children}</StoreContext.Provider>
  );
}
