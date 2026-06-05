import { makeAutoObservable } from 'mobx';

export class SessionStore {
  sessions: unknown[] = [];

  constructor() {
    makeAutoObservable(this);
  }
}
