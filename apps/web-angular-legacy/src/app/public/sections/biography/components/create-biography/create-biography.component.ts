import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { BiographyCreateModel } from '../../models/biography-create.model';
import { BiographyDatastoreService } from '../../services/biography-datastore.service';

@Component({
  selector: 'app-create-biography',
  templateUrl: './create-biography.component.html',
  styleUrls: ['./create-biography.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'biography'}
    }
  ],
})
export class CreateBiographyComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  private subscriptions = new Subscription();
  public errorCreateBiography: string;
  public loadingDone: boolean = false;
  createBiographyForm: UntypedFormGroup = new UntypedFormGroup({});
  public assetUrl = environment.assetUrl;
  public biographyObject: any;

  constructor(
    private biographyDatastoreService: BiographyDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.biographyDatastoreService.ErrorBiographyDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateBiography = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorCreateBiography = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateBiography = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this.initForm();
    this.loadingDone = true;
  }


  initForm() {
    this.createBiographyForm = this.formBuilder.group({
      nicknames: ['', Validators.required],
      homeCity: ['', Validators.required],
      placesLived: ['', Validators.required],
      religion: ['', Validators.required],
      education: ['', Validators.required],
      work: ['', Validators.required],
      hobbies: ['', Validators.required],
    });
  }

  get formControls() {
    return this.createBiographyForm.controls;
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateBiography, modalState);
  }

  async onSubmitForm() {
    const formValue = this.createBiographyForm.value;

    const newBiography = new BiographyCreateModel(
      formValue['nicknames'],
      formValue['homeCity'],
      formValue['placesLived'],
      formValue['religion'],
      formValue['education'],
      formValue['work'],
      formValue['hobbies'],
    );

    const result = await this.biographyDatastoreService.createBiography(newBiography, this.memorialId);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.CreateBiography, ModalStateEnum.ClosedAndRefreshed);
    }
  }
}


