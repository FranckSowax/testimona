import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { FuneralModel } from '../../models/funeral.model';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';
import { DatePipe } from '@angular/common';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-display-funeral',
  templateUrl: './display-funeral.component.html',
  styleUrls: ['./display-funeral.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    },
    DatePipe
  ],
})

export class DisplayFuneralComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;
  @Input('funeralEventId') funeralEventId: number;

  createFuneralModalViewModel: ModalViewModel;
  myFuneral: boolean;
  editFuneralModalViewModel: ModalViewModel;
  displayCreateFuneral: boolean = false;
  public loadingDone: boolean = false;
  public createDate: string;
  public funeralObject: FuneralModel;
  public assetUrl = environment.assetUrl;

  private _subscriptions = new Subscription();

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private router: Router,
    private profileInfosService: ProfileInfosService,
    private funeralDatastoreService: FuneralDatastoreService,
    private datepipe: DatePipe ) { }

  async ngOnInit(): Promise<void> {
    this.createFuneralModalViewModel = new ModalViewModel(ModalNameEnum.CreateFuneral, ModalStateEnum.Closed);
    this.editFuneralModalViewModel = new ModalViewModel(ModalNameEnum.EditFuneral, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.CreateFuneral) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateFuneral = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getFuneral();
          }
        } else if (modal.id == ModalNameEnum.EditFuneral) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateFuneral = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getFuneral();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone == true;
        })
    );

    this.getFuneral();
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  getFuneral() {
    this.funeralDatastoreService.getFuneral(this.memorialId).subscribe((funeral) => {
      if (funeral != null) {
        this.funeralObject = funeral;
        this.createDate = this.datepipe.transform(this.funeralObject.createDate, 'MM/dd/yyyy');

        this.myFuneral = this.profileInfosService.getCurrentUserInfos().userId == this.funeralObject.userInfo.userId;
      }

      this.loadingDone = true;
    });
  }

  createFuneral() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateFuneral);
  }

  editFuneral() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myFuneral) {
      this.modalDatastoreService.open(ModalNameEnum.EditFuneral);
    }
  }

}
