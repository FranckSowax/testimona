import { DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { filter } from 'lodash-es';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { environment } from 'src/environments/environment';
import { FuneralEventModel } from '../../models/funeral-event.model';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';

@Component({
  selector: 'app-display-funeral-event',
  templateUrl: './display-funeral-event.component.html',
  styleUrls: ['./display-funeral-event.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    },
    DatePipe
  ]
})
export class DisplayFuneralEventComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;

  createFuneralEventModalViewModel: ModalViewModel;
  editFuneralEventModalViewModel: ModalViewModel;
  public assetUrl = environment.assetUrl;
  displayCreateFuneralEvent: boolean = false;
  displayEditFuneralEvent: boolean = false;
  public loadingDone: boolean = false;
  public listOfFuneralEvents: FuneralEventModel[];
  public createDate: string;
  public funeralEventId: number;

  private _subscriptions = new Subscription();

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private profileInfosService: ProfileInfosService,
    private funeralDatastoreService: FuneralDatastoreService,
    private router: Router,
    private datepipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.createFuneralEventModalViewModel = new ModalViewModel(ModalNameEnum.CreateFuneralEvent, ModalStateEnum.Closed);
    this.editFuneralEventModalViewModel = new ModalViewModel(ModalNameEnum.EditFuneralEvent, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.CreateFuneralEvent) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateFuneralEvent = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.displayCreateFuneralEvent = false;
            (async () => {
              this.getFuneralEventList()
            })();
          }
        } else if (modal.id == ModalNameEnum.EditFuneralEvent) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateFuneralEvent = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.displayCreateFuneralEvent = false;
            (async () => {
              this.getFuneralEventList()
            })();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone == true;
        })
    );

    (async () => {
      this.getFuneralEventList()
    })();
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  async getFuneralEventList() {
    const listOfFuneralEvents = await this.funeralDatastoreService.getFuneralEventList(this.memorialId);
    if (listOfFuneralEvents) {
      this.listOfFuneralEvents = listOfFuneralEvents;
      this.loadingDone = true;
    }
  }

  createFuneralEvent() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateFuneralEvent);
  }

  getDate(date: string) {
    return this.datepipe.transform(new Date(date), 'MM/dd/yyyy')
  }

  myFuneralEvent(funeralEventUserId: string): boolean {
    return this.profileInfosService.getCurrentUserInfos().userId == funeralEventUserId;
  }

  editFuneralEvent(funeralEventId: number, funeralEventUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myFuneralEvent(funeralEventUserId)) {
      this.funeralEventId = funeralEventId
      this.modalDatastoreService.open(ModalNameEnum.EditFuneralEvent);
    }
  }

  deleteFuneralEvent(funeralEventId: number, funeralEventUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myFuneralEvent(funeralEventUserId)) {
      this.funeralEventId = funeralEventId
      const result = this.funeralDatastoreService.deleteFuneralEvent(funeralEventId)
      if (result) {
        this.listOfFuneralEvents = filter(this.listOfFuneralEvents, (item: FuneralEventModel) => item.id != funeralEventId);
      }
    }
  }

}
