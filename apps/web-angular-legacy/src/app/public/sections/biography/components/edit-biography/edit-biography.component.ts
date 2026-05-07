import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { BiographyCreateModel } from '../../models/biography-create.model';
import { BiographyModel } from '../../models/biography.model';
import { BiographyDatastoreService } from '../../services/biography-datastore.service';

@Component({
  selector: 'app-edit-biography',
  templateUrl: './edit-biography.component.html',
  styleUrls: ['./edit-biography.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography' }
    }
  ],
})
export class EditBiographyComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  private subscriptions = new Subscription();
  public errorEditBiography: string;
  public biographyObject: BiographyModel;
  public loadingDone: boolean = false;
  editBiographyForm: UntypedFormGroup = new UntypedFormGroup({});
  public assetUrl = environment.assetUrl;

  constructor(
    private biographyDatastoreService: BiographyDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,

  ) { }

  async ngOnInit(): Promise<void> {
    this.subscriptions.add(
      this.biographyDatastoreService.ErrorBiographyDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorEditBiography = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorEditBiography = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditBiography = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
    this.getBiography()
  }

  async getBiography() {
    await this.biographyDatastoreService.getBiography(this.memorialId).subscribe((biography) => {
      if (biography != null) {
        this.biographyObject = biography;
      }
      this.initForm(this.biographyObject);
      this.loadingDone = true;
    });
  }

  initForm(biography: BiographyModel) {
    this.editBiographyForm = this.formBuilder.group({
      nicknames: ['', Validators.required],
      homeCity: ['', Validators.required],
      placesLived: ['', Validators.required],
      religion: ['', Validators.required],
      education: ['', Validators.required],
      work: ['', Validators.required],
      hobbies: ['', Validators.required],
    });

    this.editBiographyForm.controls['nicknames'].setValue(biography.nicknames);
    this.editBiographyForm.controls['homeCity'].setValue(biography.homeCity);
    this.editBiographyForm.controls['placesLived'].setValue(biography.placesLived);
    this.editBiographyForm.controls['religion'].setValue(biography.religion);
    this.editBiographyForm.controls['education'].setValue(biography.education);
    this.editBiographyForm.controls['work'].setValue(biography.work);
    this.editBiographyForm.controls['hobbies'].setValue(biography.hobbies);

  }

  get formControls() {
    return this.editBiographyForm.controls;
  }

  async onSubmitForm() {
    const formValue = this.editBiographyForm.value;
    const editedBiography = new BiographyCreateModel(
      formValue['nicknames'],
      formValue['homeCity'],
      formValue['placesLived'],
      formValue['religion'],
      formValue['education'],
      formValue['work'],
      formValue['hobbies'],
    );

    const result = await this.biographyDatastoreService.editBiography(this.memorialId, editedBiography);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.EditBiography, ModalStateEnum.ClosedAndRefreshed);
    }
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditBiography, modalState);
  }

}
