import { makeAutoObservable } from 'mobx';

export class SftpBrowserStore {
  cwd = '/';

  constructor() {
    makeAutoObservable(this);
  }
}
