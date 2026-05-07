import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ModalViewComponent } from '../components/modal-view/modal-view.component';
import { ModalStateEnum } from '../enums/modal.enum';
import { ModalViewModel } from '../models/modal-view.model';

@Injectable({
  providedIn: 'root'
})
export class ModalDatastoreService {
  private _modals: Array<ModalViewComponent> = [];
  private _modalState$ = new BehaviorSubject<ModalViewModel | undefined>(undefined);
   
  public ModalState$ = this._modalState$.asObservable();

  add(modal: ModalViewComponent): void {
    // add modal to array of active modals
    this._modals.push(modal);
  }

  remove(id: string): void {
    // remove modal from array of active modals
    this._modals = this._modals.filter((component: ModalViewComponent) => component.modalData.id !== id);
  }

  open(id: string, closeState?: ModalStateEnum): void {
    // open modal specified by id
    const modal = this._modals.find((component: ModalViewComponent) => component.modalData.id === id);
    if (!modal) return;
    if (modal.modalData.state == ModalStateEnum.Opened) return;

    modal.modalData.state = ModalStateEnum.Opened;
    modal.modalData.closingState = closeState;
    this._modalState$.next(modal.modalData);
    modal.open();
  }

  close(id: string, state?: ModalStateEnum): void {
    // close modal specified by id
    const modal = this._modals.find((component: ModalViewComponent) => component.modalData.id === id);
    if (!modal) return;

    modal.modalData.state = state ?? ModalStateEnum.Closed;
    this._modalState$.next(modal.modalData);
    modal.close();
  }
}
