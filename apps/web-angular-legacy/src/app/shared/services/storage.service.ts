import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {}

  // #region Session Storage
  public addSessionStorage(key: string, value: any) {
    if (window.sessionStorage) {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }

  public getSessionStorage(key: string): any {
    if (window.sessionStorage) {
      const storage = sessionStorage.getItem(key);
      if (storage != null) {
        return JSON.parse(storage);
      }
    }

    return null;
  }

  public removeSessionStorage(key: string) {
    if (window.sessionStorage) {
      sessionStorage.removeItem(key);
    }
  }
  // #endregion

  // #region Local Storage
  public addLocalStorage(key: string, value: any): any {
    if (window.localStorage) {
      return localStorage.setItem(key, JSON.stringify(value));
    }

    return null;
  }

  public getLocalStorage(key: string): any {
    if (window.localStorage) {
      const value = localStorage.getItem(key);
      if (value != null) {
        return JSON.parse(value);
      }
    }

    return '';
  }

  public removeLocalStorage(key: string) {
    if (window.localStorage) {
      localStorage.removeItem(key);
    }
  }
  // #endregion
}
