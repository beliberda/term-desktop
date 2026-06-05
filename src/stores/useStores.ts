import { useContext } from 'react';
import { StoreContext } from './context';
import type { RootStore } from './RootStore';

export function useStores(): RootStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStores must be used within StoreProvider');
  }
  return store;
}
