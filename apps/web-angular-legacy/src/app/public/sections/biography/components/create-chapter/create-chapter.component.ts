import { Component, Input, OnInit } from '@angular/core';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ChapterDatastoreService } from '../../services/chapter-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ChapterCreateModel } from '../../models/chapter-create.model';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';

@Component({
  selector: 'app-create-chapter',
  templateUrl: './create-chapter.component.html',
  styleUrls: ['./create-chapter.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography' }
    },
  ]
})
export class CreateChapterComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  private subscriptions = new Subscription();
  public errorCreateChapter: string;
  public loadingDone: boolean = false;
  createChapterForm: UntypedFormGroup = new UntypedFormGroup({});
  public assetUrl = environment.assetUrl;
  private formUpdateData = new FormData();

  public acceptedFiles = 'image/png, image/jpeg';
  public maximumFiles = 2;

  public createInProgress: boolean = false;

  private fileToUpload: Array<File> = new Array<File>();

  constructor(
    private chapterDatastoreService: ChapterDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
    private photoDatastoreService: PhotoDatastoreService
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.chapterDatastoreService.ErrorChapterDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateChapter = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorCreateChapter = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateChapter = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
    this.initForm();
    this.loadingDone = true;
  }

  initForm() {
    this.createChapterForm = this.formBuilder.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
    });
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateChapter, modalState);
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
  }

  async onSubmitCreateForm() {
    this.createInProgress = true;
    const formValue = this.createChapterForm.value;

    const newChapter = new ChapterCreateModel(
      this.memorialId,
      formValue['title'],
      formValue['content'],
    );

    const result = await this.chapterDatastoreService.createChapter(newChapter, this.memorialId);
    if (result) {
      if (this.fileToUpload.length == 0) {
        this.createInProgress = false;
        this.reset();
        this.modalDatastoreService.close(ModalNameEnum.CreateChapter, ModalStateEnum.ClosedAndRefreshed);
        return;
      }
      const resultAddPhotos = await this.addPhoto(result.id);
      if (resultAddPhotos) {
        this.createInProgress = false;
        this.reset();
        this.modalDatastoreService.close(ModalNameEnum.CreateChapter, ModalStateEnum.ClosedAndRefreshed);
        return;
      } else {
        this.createInProgress = false;
        return;
      }
    }
    this.createInProgress = false;
  }

  private async addPhoto(chapterId: number): Promise<boolean> {
    if (this.fileToUpload.length < 1) {
      return Promise.resolve(true);
    }

    this.formUpdateData.append('objectId', chapterId.toString());
    this.formUpdateData.append('objectType', UploadObjectType.Chapter);

    if (this.fileToUpload.length > 1) {
      for (let i = 0; i < this.fileToUpload.length; i++) {
        this.formUpdateData.append('previousFilesData', JSON.stringify({ previousName: '' }));
        this.formUpdateData.append('file', this.fileToUpload[i]);
      };
    } else {
      this.formUpdateData.append('previousFilesData', JSON.stringify({ previousName: '' }));
      this.formUpdateData.append('file', this.fileToUpload[0])
    }

    const newObjectPhoto = await this.photoDatastoreService.createPhoto(this.formUpdateData);
    if (newObjectPhoto) {
      return Promise.resolve(newObjectPhoto.length == this.fileToUpload.length);
    }
    return Promise.resolve(false);
  }

  private reset() {
    this.createChapterForm.controls['title'].setValue('');
    this.createChapterForm.controls['content'].setValue('');
  }
}
