import { Component, Input, OnInit } from '@angular/core';
import { TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { environment } from 'src/environments/environment';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum';
import { TranslocoService } from '@ngneat/transloco';
import { MemorialRequestAdminModel } from '../../models/memorial-request-admin.model';
import { MemorialDatastoreService } from '../../services/memorial-datastore.service';
import { MemorialModel } from '../../models/memorial.model';
import { Subscription } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';

@Component({
  selector: 'app-admin-memorial',
  templateUrl: './admin-memorial.component.html',
  styleUrls: ['./admin-memorial.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'memorial' }
    }
  ],
})
export class MemorialAdminComponent implements OnInit {
  @Input('memorialId') memorialId: number;
  
  public adminMemorialForm: UntypedFormGroup = new UntypedFormGroup({});
  public relatives = new Array<KeyValuePairModel>();
  public memorialURL: string;
  public loadingDone: boolean = false;
  public displayedMemorial: MemorialModel;
  public assetUrl = environment.assetUrl;
  public error_message: string;

  private subscriptions = new Subscription();


  get formControls() {
    return this.adminMemorialForm.controls;
  }

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private formBuilder: UntypedFormBuilder,
    private translocoService: TranslocoService,
    private memorialDatastoreService: MemorialDatastoreService) { }

  ngOnInit(): void {  
    const relativeTranslation = this.translocoService.translateObject("relatives");
    this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);
    this.subscriptions.add(
      this.memorialDatastoreService.ErrorMemorialDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.error_message = '';
          switch(errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist: 
            case ApiResultResponseEnum.CreateMemorialRequestFailed:
              this.error_message = this.translocoService.translate('error.api');
              break;
            default:
              this.error_message = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
    this.initForm();
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.AdminMemorial, modalState);
  }

  private initForm() {
    this.adminMemorialForm = this.formBuilder.group({
      isAdmin: ['', Validators.required],
      note: ['', Validators.required],
      relatives: ['', Validators.required],
    });
  }

  async onSubmitForm() {
    const formValue = this.adminMemorialForm.value;
      const newRequestAdminMemorial = new MemorialRequestAdminModel(
        this.memorialId,
        RelativesEnum[formValue['relatives']],
        formValue['note']
      );
      const result = await this.memorialDatastoreService.sendRequestAdmin(newRequestAdminMemorial);
      if (result) {
        this.closeModal();
      }

  }

}
