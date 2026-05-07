import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TRANSLOCO_SCOPE, TranslocoService } from '@ngneat/transloco';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ProfileInfosService } from 'src/app/shared/datastores/profile-infos.datastore.service';
import { ModalNameEnum } from 'src/app/shared/enums/modal.enum';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { environment } from 'src/environments/environment';
import { TestimonaListModel } from '../../models/testimona.model';
import { TestimonaDatastoreService } from '../../services/testimona.datastore.service';
import { SharedPhotoViewerComponent } from 'src/app/shared/components/photo-viewer/photo-viewer.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-list-item-testimona',
  templateUrl: './list-item-testimona.component.html',
  styleUrls: ['./list-item-testimona.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'testimona' }
    }
  ],
})
export class TestimonaListItemComponent implements OnInit, OnChanges {
  @Input('item') testimonaItem: TestimonaListModel;
  @Input('relatives') relativeList: Array<KeyValuePairModel>;

  @Output('editOnClick') editOnClick = new EventEmitter<number>();
  @Output('deleteOnClick') deleteOnClick = new EventEmitter<number>();

  @ViewChild('nbLike', { static: false }) nbLike: ElementRef<HTMLTextAreaElement>;

  public loadingDone: boolean = false;
  public assetUrl = environment.assetUrl;
  public testimonaId: number;
  public relativeString: string;

  constructor(
    private testimonaDatastoreService: TestimonaDatastoreService,
    private modalDatastoreService: ModalDatastoreService,
    private profileInfosService: ProfileInfosService,
    private translocoService: TranslocoService,
    private matDialog: MatDialog,
    private clipboard: Clipboard,
    private _snackBar: MatSnackBar

    ) { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    this.relativeString = this.relativeList[EnumHelpers.getEnumKeyValue(RelativesEnum, this.testimonaItem.userInfo.relationship)].value;
  }

  myTestimona(testimonaUserId: string): boolean {
    return this.profileInfosService.getCurrentUserInfos().userId == testimonaUserId;
  }

  editTestimona(testimonaId: number, testimonaUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myTestimona(testimonaUserId)) {
      this.editOnClick.emit(testimonaId);
      this.modalDatastoreService.open(ModalNameEnum.EditTestimona);
    }
  }

  async deleteTestimona(testimonaId: number, testimonaUserId: string) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }

    if (this.myTestimona(testimonaUserId)) {
      this.deleteOnClick.emit(testimonaId);
    }
  }

  openFullsize(photoUrl: string): void {
    this.matDialog.open(SharedPhotoViewerComponent, {
      panelClass: 'photo-viewer-dialog',
      data: {
        photoUrl: photoUrl
      }
    });
  }

  shareTestimona() {
    this.clipboard.copy(location.href);
    this._snackBar.open(this.translocoService.translate('testimona.display_testimona.copied'), '',  {
      duration: 3000
    });
  }

  async likeTestimona(testimonaId: number, item: HTMLImageElement) {
    if (!this.profileInfosService.IsLoggedIn$().getValue()) {
      this.modalDatastoreService.open(ModalNameEnum.Signin);
      return;
    }
    if (item.src.includes('empty')) {
      item.src = this.assetUrl + "like-filled.svg"
      const result = await this.testimonaDatastoreService.likeTestimona(testimonaId);
      if (result) {
        this.nbLike.nativeElement.innerHTML = (Number(this.nbLike.nativeElement.innerHTML) + 1).toString();
      }
    } else {
      item.src = this.assetUrl + "like-empty.svg"
      const result = await this.testimonaDatastoreService.unlikeTestimona(testimonaId);
      if (result) {
        this.nbLike.nativeElement.innerHTML = (Number(this.nbLike.nativeElement.innerHTML)- 1).toString();
      }
    }
  }
}
