import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { FuneralCreateEditModel } from '../../models/funeral-create-edit.model';
import { FuneralModel } from '../../models/funeral.model';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';

@Component({
  selector: 'app-edit-funeral',
  templateUrl: './edit-funeral.component.html',
  styleUrls: ['./edit-funeral.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    }
  ],
})
export class EditFuneralComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  private subscriptions = new Subscription();
  public errorEditFuneral: string;
  public loadingDone: boolean = false;
  public assetUrl = environment.assetUrl;
  editFuneralForm: UntypedFormGroup = new UntypedFormGroup({});
  public displayedFuneral: FuneralModel;


  constructor(
    private funeralDatastoreService: FuneralDatastoreService,
    private translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
  ) { }

  async ngOnInit(): Promise<void>  {
    this.subscriptions.add(
      this.funeralDatastoreService.ErrorFuneralDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorEditFuneral = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorEditFuneral = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditFuneral = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    await this.getFuneral()

  }

  async getFuneral() {
    await this.funeralDatastoreService.getFuneral(this.memorialId).subscribe((funeral) => {
      this.displayedFuneral = funeral;
      this.loadingDone = true;
      this.initForm(this.displayedFuneral);
    });
  }

  initForm(displayedFuneral: FuneralModel) {
    this.editFuneralForm = this.formBuilder.group({
      content: ['', Validators.required],
    });

    this.editFuneralForm.controls['content'].setValue(displayedFuneral.content);
  }

  get formControls() {
    return this.editFuneralForm.controls;
  }

  async onSubmitForm() {
    const formValue = this.editFuneralForm.value;
    const editedFuneral = new FuneralCreateEditModel(
      formValue['content'],
    );

    const result = await this.funeralDatastoreService.editFuneral(this.memorialId, editedFuneral);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.EditFuneral, ModalStateEnum.ClosedAndRefreshed);
    }
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditFuneral, modalState);
  }

}
