import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { FuneralCreateEditModel } from '../../models/funeral-create-edit.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-create-funeral',
  templateUrl: './create-funeral.component.html',
  styleUrls: ['./create-funeral.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    }
  ],
})

export class CreateFuneralComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  private subscriptions = new Subscription();
  public assetUrl = environment.assetUrl;
  public loadingDone: boolean = false;
  public errorCreateFuneral: string;
  createFuneralForm: UntypedFormGroup = new UntypedFormGroup({});


  constructor(
    private funeralDatastoreService: FuneralDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.funeralDatastoreService.ErrorFuneralDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateFuneral = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorCreateFuneral = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateFuneral = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this.initForm();
    this.loadingDone = true;
  }

  initForm() {
    this.createFuneralForm = this.formBuilder.group({
      content: ['', Validators.required],
    });
  }

  get formControls() {
    return this.createFuneralForm.controls;
  }

  async onSubmitForm() {
    const formValue = this.createFuneralForm.value;

    const newFuneral = new FuneralCreateEditModel(
      formValue['content'],
    );

    const result = await this.funeralDatastoreService.createFuneral(newFuneral, this.memorialId);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.CreateFuneral, ModalStateEnum.ClosedAndRefreshed);
    }
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateFuneral, modalState);
  }

}
