import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ChapterModel } from '../../models/chapter.model';
import { ChapterDatastoreService } from '../../services/chapter-datastore.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { environment } from 'src/environments/environment';
import { ChapterEditModel } from '../../models/chapter-edit.model';
import { ImportFile } from 'src/app/shared/components/upload-media/upload-media.component';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';

@Component({
  selector: 'app-edit-chapter',
  templateUrl: './edit-chapter.component.html',
  styleUrls: ['./edit-chapter.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography' }
    },
  ],
})
export class EditChapterComponent implements OnInit {
  @Input('chapterId') chapterId: number;

  private subscriptions = new Subscription();
  public errorEditChapter: string;
  public chapter: ChapterModel;
  public loadingDone: boolean = false;
  editChapterForm: UntypedFormGroup = new UntypedFormGroup({});
  public assetUrl = environment.assetUrl;

  public acceptedFiles = 'image/png, image/jpeg';
  public maximumFiles = 2;
  public createInProgress: boolean = false;
  public previousFiles: Array<ImportFile> = new Array<ImportFile>();
  private fileToDelete: Array<string> = new Array<string>();
  private fileToUpload: Array<File> = new Array<File>();
  private formData = new FormData();

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
          this.errorEditChapter = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.ChapterEventNotExist:
            case ApiResultResponseEnum.UpdateChapterEventFailed:
              this.errorEditChapter = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditChapter = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    this.reset();
    await this.getChapter();
  }

  async getChapter() {
    if (this.chapterId > 0) {
      this.chapterDatastoreService.getChapter(this.chapterId).subscribe((chapter) => {
        this.chapter = chapter;
        this.previousFiles = chapter.photoArray.map((ite) => ({ filename: ite.photoId, photoUrl: ite.thumbnail } as ImportFile));
        this.loadingDone = true;
        this.initForm(this.chapter);
      });
    }
    this.loadingDone = true
    // Ici afficher message d'erreur
  }

  initForm(chapter: ChapterModel) {
    this.editChapterForm = this.formBuilder.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
    });
    this.editChapterForm.controls['title'].setValue(chapter.title);
    this.editChapterForm.controls['content'].setValue(chapter.content);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditChapter, modalState);
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
    this.fileToDelete = event.files.toDelete;
  }

  async onSubmitForm() {
    this.createInProgress = true;
    const formValue = this.editChapterForm.value;
    const editedChapter = new ChapterEditModel(
      formValue['title'],
      formValue['content'],
    );

    const result = await this.chapterDatastoreService.editChapter(this.chapterId, editedChapter);
    if (result) {
      if (this.fileToUpload.length == 0 && this.fileToDelete.length == 0) {
        this.createInProgress = false;
        this.modalDatastoreService.close(ModalNameEnum.EditChapter, ModalStateEnum.ClosedAndRefreshed);
      } else {
        const resultAddPhotos = await this.addPhoto();
        if (resultAddPhotos) {
          this.createInProgress = false;
          this.modalDatastoreService.close(ModalNameEnum.EditChapter, ModalStateEnum.ClosedAndRefreshed);
        }
      }
    }
    this.reset();
    this.createInProgress = false;
  }

  private async addPhoto(): Promise<boolean> {
    this.formData.append('objectId', this.chapterId.toString());
    this.formData.append('objectType', UploadObjectType.Chapter);
    if (this.fileToUpload.length > 0) {
      this.fileToUpload.forEach((ite) => this.formData.append('file', ite));
    }

    if (this.fileToDelete.length > 0) {
      this.formData.append('photosToDeleteIds', this.fileToDelete.join(','));
    }

    const newObjectPhoto = await this.photoDatastoreService.updatePhoto(this.formData);
    this.formData = new FormData();
    if (newObjectPhoto) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  private reset() {
    if (this.editChapterForm != null && this.editChapterForm != undefined) {
        this.editChapterForm.controls['title']?.setValue('');
        this.editChapterForm.controls['content']?.setValue('');
    }

    this.previousFiles = new Array<ImportFile>();
    this.fileToUpload = new Array<File>();
  }
}
