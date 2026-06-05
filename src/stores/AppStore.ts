import { makeAutoObservable } from 'mobx';
import type { SidebarTab } from '@/types';

export class AppStore {
  sidebarTab: SidebarTab = 'sessions';
  pingStatus = '';

  constructor() {
    makeAutoObservable(this);
  }

  setSidebarTab(tab: SidebarTab) {
    this.sidebarTab = tab;
  }

  setPingStatus(status: string) {
    this.pingStatus = status;
  }
}
