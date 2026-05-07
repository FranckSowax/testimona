import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { TestimonaDatastoreService } from '../../services/testimona.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { TestimonaGetModel } from '../../models/testimona-get.model';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { TestimonaEditModel } from '../../models/testimona-edit.model';
import { environment } from 'src/environments/environment';
import { ImportFile } from 'src/app/shared/components/upload-media/upload-media.component';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';

@Component({
  selector: 'app-edit-testimona',
  templateUrl: './edit-testimona.component.html',
  styleUrls: ['./edit-testimona.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'testimona' }
    },
  ],
})
export class EditTestimonaComponent implements OnInit {
  @Input('testimonaId') testimonaId: number;

  private subscriptions = new Subscription();
  public errorEditTestimona: string;
  public testimona: TestimonaGetModel;
  public loadingDone: boolean = false;
  editTestimonaForm: UntypedFormGroup = new UntypedFormGroup({});
  public assetUrl = environment.assetUrl;

  public acceptedFiles = 'image/png, image/jpeg';
  public maximumFiles = 2;
  public createInProgress: boolean = false;
  public previousFiles: Array<ImportFile> = new Array<ImportFile>();
  private fileToDelete: Array<string> = new Array<string>();
  private fileToUpload: Array<File> = new Array<File>();
  private formData = new FormData();

  constructor(
    private testimonaDatastoreService: TestimonaDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
    private photoDatastoreService: PhotoDatastoreService

  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.testimonaDatastoreService.ErrorTestimonaDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorEditTestimona = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.TestimonaEventNotExist:
            case ApiResultResponseEnum.UpdateTestimonaEventFailed:
              this.errorEditTestimona = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditTestimona = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await this.getTestimona();
    this.reset()
  }

  async getTestimona() {
    if (this.testimonaId > 0) {
      this.testimonaDatastoreService.getTestimona(this.testimonaId).subscribe((testimona) => {
        this.testimona = testimona;
        this.previousFiles = testimona.photoArray.map((ite) => ({ filename: ite.photoId, photoUrl: ite.thumbnail } as ImportFile));
        this.loadingDone = true;
        this.initForm(this.testimona);
      });
    }
    this.loadingDone = true
    // Ici afficher message d'erreur
  }

  initForm(testimona: TestimonaGetModel) {
    this.editTestimonaForm = this.formBuilder.group({
      content: ['', Validators.required],
    });
    this.editTestimonaForm.controls['content'].setValue(testimona.content);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditTestimona, modalState);
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
    this.fileToDelete = event.files.toDelete;
  }

  async onSubmitForm() {
    this.createInProgress = true;
    const formValue = this.editTestimonaForm.value;
    const editedTestimona = new TestimonaEditModel(
      formValue['content'],
    );

    const result = await this.testimonaDatastoreService.editTestimona(this.testimonaId, editedTestimona);
    if (result) {
      if (this.fileToUpload.length == 0 && this.fileToDelete.length == 0) {
        this.createInProgress = false;
        this.modalDatastoreService.close(ModalNameEnum.EditTestimona, ModalStateEnum.ClosedAndRefreshed);
      } else {
        const resultAddPhotos = await this.addPhoto();
        if (resultAddPhotos) {
          this.createInProgress = false;
          this.modalDatastoreService.close(ModalNameEnum.EditTestimona, ModalStateEnum.ClosedAndRefreshed);
        }
      }
    }
    this.reset();
    this.createInProgress = false;
  }

  private async addPhoto(): Promise<boolean> {
    this.formData.append('objectId', this.testimonaId.toString());
    this.formData.append('objectType', UploadObjectType.Testimonial);

    if (this.fileToUpload.length > 0) {
      this.fileToUpload.forEach((ite) => this.formData.append('file', ite));
    }

    if (this.fileToDelete.length > 0) {
      this.fileToDelete.forEach((ite) => this.formData.append('photosToDeleteIds', ite));
    }

    const newObjectPhoto = await this.photoDatastoreService.updatePhoto(this.formData);
    if (newObjectPhoto) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  private reset() {
    if (this.editTestimonaForm != null && this.editTestimonaForm != undefined) {
      this.editTestimonaForm.controls['content']?.setValue('');
    }

    this.previousFiles = new Array<ImportFile>();
    this.fileToUpload = new Array<File>();
  }
}
