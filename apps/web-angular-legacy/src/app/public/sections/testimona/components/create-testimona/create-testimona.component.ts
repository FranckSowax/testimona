import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { TestimonaCreateModalModel, TestimonaCreateModel } from '../../models/testimona-create.model'
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum';
import { TestimonaDatastoreService } from '../../services/testimona.datastore.service';
import { SearchParentSourceEnum } from 'src/app/shared/enums/search-parent-source.enum';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { Router } from '@angular/router';
import { SelectedMemorialSearchModel } from 'src/app/shared/models/search-result.model';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';

@Component({
  selector: 'app-create-testimona',
  templateUrl: './create-testimona.component.html',
  styleUrls: ['./create-testimona.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'testimona' }
    }
  ],
})
export class TestimonaCreateComponent implements OnInit, OnDestroy {
  @Input('memorialData') memorialData: TestimonaCreateModalModel;

  public createTestimonaForm: UntypedFormGroup = new UntypedFormGroup({});

  public errorCreateTestimona: string;

  public assetUrl = environment.assetUrl;
  public searchParentSourceEnum = SearchParentSourceEnum;
  public memorialUrl: string;
  public relatives = new Array<KeyValuePairModel>();
  public createInProgress: boolean = false;
  public formData = new FormData();

  public maximumFiles = 2;
  public acceptedFiles = 'image/png, image/jpeg';
  public memorialUserRelationship: number;

  private memorialId: number;
  private subscriptions = new Subscription();
  private fileToUpload: Array<File> = new Array<File>();

  get formControls() {
    return this.createTestimonaForm.controls;
  }

  constructor(private modalDatastoreService: ModalDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private testimonaDatastoreService: TestimonaDatastoreService,
    private router: Router,
    private photoDatastoreService: PhotoDatastoreService
    ) { }

  ngOnInit(): void {
    const relativeTranslation = this.translocoService.translateObject("relatives");
    this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);

    this.subscriptions.add(
      this.testimonaDatastoreService.ErrorTestimonaDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateTestimona = '';
          switch(errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
            case ApiResultResponseEnum.CreateTestimonialByMemorialIdFailed:
              this.errorCreateTestimona = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateTestimona = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this.initForm();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initForm() {
    this.createTestimonaForm = this.formBuilder.group({
      memorialId: ['', Validators.required],
      content: [''],
      relatives: [''],
    });

    this.createTestimonaForm.controls['memorialId'].setValue(this.memorialData.memorialId);
    this.memorialId = this.memorialData.memorialId;
    this.memorialUrl = this.memorialData.memorialUrl;
    if (this.memorialData.relative != -1) {
      this.createTestimonaForm.controls['relatives'].setValue(this.memorialData.relative);
      this.createTestimonaForm.controls['relatives'].disable();
    } else {
      this.createTestimonaForm.controls['relatives'].setValue(undefined);
    }
  }

  selectMemorial(memorialItem: SelectedMemorialSearchModel) {
    this.createTestimonaForm.controls['memorialId'].setValue(memorialItem.memorialId);
    this.memorialId = memorialItem.memorialId;
    this.memorialUrl = memorialItem.memorialUrl;
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
  }

  async onSubmitForm() {
    if (this.createTestimonaForm.value['content'] == '' && this.fileToUpload.length < 1) {
      return;
    }

    this.createInProgress = true;
    const formValue = this.createTestimonaForm.value;

    const newTestimona = new TestimonaCreateModel(
      formValue['content'],
      RelativesEnum[this.memorialData.relative] || RelativesEnum[formValue['relatives']],
    );

    const result = await this.testimonaDatastoreService.createTestimona(this.memorialId, newTestimona);
    if (result && result.id > 0) {
      if (this.fileToUpload.length == 0) {
        this.createInProgress = false;
        this.reset();
        this.closeModal(ModalStateEnum.ClosedAndRefreshed);
        this.router.navigate(["memorial", this.memorialUrl]);
        return;
      }
      const resultAddPhotos = await this.addPhoto(result.id);
      if (resultAddPhotos) {
        this.createInProgress = false;
        this.reset();
        this.closeModal(ModalStateEnum.ClosedAndRefreshed);
        return;
      } else {
        this.createInProgress = false;
        return;
      }
    }
    this.createInProgress = false;
  }

  private async addPhoto(testimonaId: number): Promise<boolean> {
    this.formData.append('objectId', testimonaId.toString());
    this.formData.append('objectType', UploadObjectType.Testimonial);

    if (this.fileToUpload.length > 1) {
      for (let i = 0; i < this.fileToUpload.length; i++) {
        this.formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
        this.formData.append('file', this.fileToUpload[i]);
      };
    } else {
      this.formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
      this.formData.append('file', this.fileToUpload[0])
    }

    const newObjectPhoto = await this.photoDatastoreService.createPhoto(this.formData);
    if (newObjectPhoto) {
      return Promise.resolve(newObjectPhoto.length == this.fileToUpload.length);
    }
    return Promise.resolve(false);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateTestimona, modalState);
  }

  private reset() {
    this.createTestimonaForm.controls['content'].setValue('');
  }
 }
