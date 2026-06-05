import { makeAutoObservable } from 'mobx';

export class TerminalStore {
  tabs: unknown[] = [];
  activeTabId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }
}
