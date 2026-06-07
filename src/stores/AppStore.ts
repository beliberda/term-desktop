import { makeAutoObservable } from 'mobx';
import type { SidebarTab } from '@/types';

export type AppView = 'main' | 'settings';

export class AppStore {
  sidebarTab: SidebarTab = 'sessions';
  activeView: AppView = 'main';
  pingStatus = '';

  constructor() {
    makeAutoObservable(this);
  }

  openSettings() {
    this.activeView = 'settings';
  }

  closeSettings() {
    this.activeView = 'main';
  }

  setSidebarTab(tab: SidebarTab) {
    this.sidebarTab = tab;
  }

  setPingStatus(status: string) {
    this.pingStatus = status;
  }
}
