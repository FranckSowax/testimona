import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MenuMemorialEnum } from '../enums/menu-memorial.enum';

@Injectable({
  providedIn: 'root'
})
export class MenuMemorialService {

  private _selectedTab$ = new BehaviorSubject<MenuMemorialEnum>(
    MenuMemorialEnum.Testimonial,
  );
  SelectedTab$ = this._selectedTab$.asObservable();

  constructor() { }

  SelectTab(newTab: MenuMemorialEnum): void {
    this._selectedTab$.next(newTab);
  }
}
