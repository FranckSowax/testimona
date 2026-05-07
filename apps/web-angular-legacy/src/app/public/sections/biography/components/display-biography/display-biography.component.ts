import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription, from } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { environment } from 'src/environments/environment';
import { BiographyModel } from '../../models/biography.model';
import { BiographyDatastoreService } from '../../services/biography-datastore.service';
import { MemorialCurrentUserModel } from '../../../memorial/models/memorial.model';
import { MemorialDatastoreService } from '../../../memorial/services/memorial-datastore.service';

@Component({
  selector: 'app-display-biography',
  templateUrl: './display-biography.component.html',
  styleUrls: ['./display-biography.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography' }
    },
  ],
})
export class DisplayBiographyComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;

  createBiographyModalViewModel: ModalViewModel;
  displayCreateBiography: boolean = false;
  displayEditBiography: boolean = false;
  editBiographyModalViewModel: ModalViewModel;
  public assetUrl = environment.assetUrl;
  private _subscriptions = new Subscription();
  public loadingDone: boolean = false;
  public biographyObject: BiographyModel;
  public currentRelationship: MemorialCurrentUserModel | null;

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private router: Router,
    private biographyDatastoreService: BiographyDatastoreService,
    private profileInfosService: ProfileInfosService,
    private memorialDatastoreService: MemorialDatastoreService,
  ) { }

  ngOnInit(): void {
    this.currentRelationship = null;
    this.createBiographyModalViewModel = new ModalViewModel(ModalNameEnum.CreateBiography, ModalStateEnum.Closed);
    this.editBiographyModalViewModel = new ModalViewModel(ModalNameEnum.EditBiography, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.CreateBiography) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayCreateBiography = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getBiography();
          }
        }
        if (modal.id == ModalNameEnum.EditBiography) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.displayEditBiography = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.getBiography();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone == true;
        })
    );

    from(this.memorialDatastoreService.getMemorialUserRelationship(this.memorialId)).subscribe((userRelationship) => {
      this.currentRelationship = userRelationship;
    });

    this.getBiography()
  }

  ngOnDestroy(): void {
      this._subscriptions.unsubscribe();
  }

  async getBiography() {
    this.biographyDatastoreService.getBiography(this.memorialId).subscribe((biography) => {
      if (biography != null) {
        this.biographyObject = biography;
      }
      this.loadingDone = true;
    });
  }

  createBiography() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.CreateBiography);
  }

  editBiography() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.EditBiography);
  }
}
