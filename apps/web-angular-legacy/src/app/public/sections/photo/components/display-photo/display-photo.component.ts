import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { SharedPhotoViewerComponent } from 'src/app/shared/components/photo-viewer/photo-viewer.component';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalViewModel } from 'src/app/shared/models/modal-view.model';
import { PhotoModel } from '../../models/photo.model';
import { PhotoDatastoreService } from '../../services/photo-datastore.service';
import { DatePipe } from '@angular/common';
import { filter } from 'lodash-es';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-display-photo',
  templateUrl: './display-photo.component.html',
  styleUrls: ['./display-photo.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'photos' }
    },
    DatePipe
  ],
})
export class DisplayPhotoComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;
  @ViewChild('nbLike', { static: false }) nbLike: ElementRef<HTMLTextAreaElement>;

  addPhotoModalViewModel: ModalViewModel;
  displayAddPhoto: boolean = false;
  public assetUrl = environment.assetUrl;

  public loadingDone: boolean = false;
  public loadMorePhoto: boolean = false;

  public isLoggedIn: boolean = false;
  public listOfPhotos: PhotoModel[];
  private _subscriptions = new Subscription();

  private pageSize: number = 8;
  private pageIndex: number = 0;

  constructor(
    private photoDatastoreService: PhotoDatastoreService,
    private modalDatastoreService: ModalDatastoreService,
    private router: Router,
    private profileInfosService: ProfileInfosService,
    private matDialog: MatDialog,
    private datepipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.addPhotoModalViewModel = new ModalViewModel(ModalNameEnum.AddPhoto, ModalStateEnum.Closed);

    this._subscriptions.add(
      this.modalDatastoreService.ModalState$.subscribe((modal: ModalViewModel | undefined) => {
        if (!modal) return;
        if (modal.id == ModalNameEnum.AddPhoto) {
          if (modal.state == ModalStateEnum.Opened || modal.state == ModalStateEnum.Closed) {
            this.photoDatastoreService.reset();
            this.displayAddPhoto = modal.state == ModalStateEnum.Opened;
          }
          else if (modal.state == ModalStateEnum.ClosedAndRefreshed) {
            this.displayAddPhoto = false;
            (async () => {
              await this.initializeList();
            })();
          }
        }
      },
        (error) => {
          console.log(error);
          this.router.navigate(['/404'])
          this.loadingDone = true;
      })
    );

    (async () => {
      await this.initializeList();
    })();
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  addPhoto() {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    this.modalDatastoreService.open(ModalNameEnum.AddPhoto);
  }

  async initializeList() {
    this.loadingDone = false;

    this.pageIndex = 0;
    const listOfPhotos = await this.photoDatastoreService.getPhotos(this.memorialId, this.pageIndex, this.pageSize);
    if (listOfPhotos && listOfPhotos.length > 0) {
      this.pageIndex++;
      this.listOfPhotos = new Array<PhotoModel>();
      this.listOfPhotos.push(...listOfPhotos);
    }

    this.loadingDone = true;
  };

  getDate(date: string) {
    return this.datepipe.transform(new Date(date), 'MM/dd/yyyy');
  }

  async onScroll() {
    this.loadMorePhoto = true;

    const listOfPhotos = await this.photoDatastoreService.getPhotos(this.memorialId, this.pageIndex, this.pageSize);
    if (listOfPhotos && listOfPhotos.length > 0) {
      this.pageIndex++;
      this.listOfPhotos.push(...listOfPhotos);
    }

    this.loadMorePhoto = false;
  }

  openFullsize(photoUrl: string): void {
    this.matDialog.open(SharedPhotoViewerComponent, {
      panelClass: 'photo-viewer-dialog',
      data: {
        photoUrl: photoUrl
      }
    });
  }

  myPhoto(photoUserId: string): boolean {
    return this.profileInfosService.getCurrentUserInfos().nickname == photoUserId;
  }

  async deletePhoto(photoId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }
    const destroyedPhoto = await this.photoDatastoreService.deletePhotos(photoId);
    if (destroyedPhoto) {
      this.listOfPhotos = filter(this.listOfPhotos, ((p) => { return p.photoId != photoId; }));
    }
  }

  async likePhoto(photoId: string, item: HTMLImageElement) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }
    if (item.src.includes('empty')) {
      item.src = this.assetUrl + "like-filled.svg"
      const result = await this.photoDatastoreService.likePhoto(photoId);
      if (result) {
        this.nbLike.nativeElement.innerHTML = (Number(this.nbLike.nativeElement.innerHTML) + 1).toString();
      }
    } else {
      item.src = this.assetUrl + "like-empty.svg"
      const result = await this.photoDatastoreService.unlikePhoto(photoId);
      if (result) {
        this.nbLike.nativeElement.innerHTML = (Number(this.nbLike.nativeElement.innerHTML) - 1).toString();
      }
    }
  }
}
