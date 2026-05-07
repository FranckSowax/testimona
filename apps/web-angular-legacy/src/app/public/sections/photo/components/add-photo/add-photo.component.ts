import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';
import { environment } from 'src/environments/environment';
import { PhotoDatastoreService } from '../../services/photo-datastore.service';

@Component({
  selector: 'app-add-photo',
  templateUrl: './add-photo.component.html',
  styleUrls: ['./add-photo.component.scss']
})
export class AddPhotoComponent implements OnInit, OnDestroy {
  @Input('memorialId') memorialId: number;
  public assetUrl = environment.assetUrl;
  public loadingDone: boolean = false;
  public errorMessage: string = "";

  public acceptedFiles = 'image/png, image/jpeg';
  public maximumFiles = 2;

  public createInProgress: boolean = false;

  public fileToUpload: Array<File> = new Array<File>();

  private _subscriptions = new Subscription();

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private photoDatastoreService: PhotoDatastoreService,
    private translocoService: TranslocoService,
  ) { }

  ngOnInit(): void {
    this.loadingDone = true;

    this._subscriptions.add(
      this.photoDatastoreService.ErrorPhotoDatastore$.subscribe((error: ApiResultResponseEnum) => {
        if (error != ApiResultResponseEnum.NoError) {
          this.errorMessage = this.translocoService.translate('error.api');
        }
      })
    );
  }

  ngOnDestroy(): void {
      this._subscriptions.unsubscribe();
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.AddPhoto, modalState);
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
  }

  async onSubmit() {
    this.createInProgress = true;

    const formData = new FormData();
    formData.append('objectId', this.memorialId.toString());
    formData.append('objectType', UploadObjectType.Photo);

    if (this.fileToUpload.length > 1) {
      for (let i = 0; i < this.fileToUpload.length; i++) {
        formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
        formData.append('file', this.fileToUpload[i]);
      };
    } else {
      formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
      formData.append('file', this.fileToUpload[0])
    }

    const newObjectPhoto = await this.photoDatastoreService.createPhoto(formData);

    this.createInProgress = false;
    if (newObjectPhoto) {
      this.modalDatastoreService.close(ModalNameEnum.AddPhoto, ModalStateEnum.ClosedAndRefreshed);
    }
  }

}
