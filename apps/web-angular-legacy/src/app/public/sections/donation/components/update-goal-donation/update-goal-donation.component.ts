import { Component, Input, OnInit } from '@angular/core';
import { TRANSLOCO_SCOPE, TranslocoService } from '@ngneat/transloco';
import { from, Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { DonationDatastoreService } from '../../services/donation-datastore.service';
import { MemorialModel } from '../../../memorial/models/memorial.model';
import { MemorialDatastoreService } from '../../../memorial/services/memorial-datastore.service';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { DonationGoalModel } from '../../models/donation.model';

@Component({
  selector: 'app-update-goal-donation',
  templateUrl: './update-goal-donation.component.html',
  styleUrls: ['./update-goal-donation.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'donation' }
    }
  ],
})
export class UpdateGoalDonationComponent implements OnInit {
  @Input('memorialId') memorialId: number;
  @Input('memorialUrl') memorialUrl: string;

  private subscriptions = new Subscription();
  public loadingDone: boolean = false;
  public errorUpdateDonationGoal: string;
  public donationGoal: DonationGoalModel;
  public assetUrl = environment.assetUrl;
  public memorialItem: MemorialModel;
  updateDonationGoalForm: UntypedFormGroup = new UntypedFormGroup({});
  public submitInProgress = false;

  constructor(
    private _donationDatastoreService: DonationDatastoreService,
    private _memorialDatastoreService: MemorialDatastoreService,
    private _modalDatastoreService: ModalDatastoreService,
    private _translocoService: TranslocoService,
    private formBuilder: UntypedFormBuilder
  ) { }

  async ngOnInit(): Promise<void> {
    this.subscriptions.add(
      this._donationDatastoreService.ErrorDonationDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorUpdateDonationGoal = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorUpdateDonationGoal = this._translocoService.translate('error.api');
              break;
            default:
              this.errorUpdateDonationGoal = this._translocoService.translate('error.api');
              break;
          }
        }
      })

      );

    from(this._donationDatastoreService.donationGoal(this.memorialId)).subscribe((donationGoal) => {
      this.donationGoal = donationGoal
      this.initForm();
      this.loadingDone = true;
    });

    from(this._memorialDatastoreService.getMemorial(this.memorialUrl)).subscribe((memorialItem) => {
      if (memorialItem != null) {
        this.memorialItem = memorialItem;
      }
    });

  }

  closeModal(modalState?: ModalStateEnum) {
    this._modalDatastoreService.close(ModalNameEnum.UpdateGoalDonation, modalState);
  }

  initForm() {
    this.updateDonationGoalForm = this.formBuilder.group({
      amount: ['', Validators.required],
      message: ['', Validators.required],
    });
    this.updateDonationGoalForm.controls['amount'].setValue(this.donationGoal.donationGoal);
    this.updateDonationGoalForm.controls['message'].setValue(this.donationGoal.message);
  }

  get formControls() {
    return this.updateDonationGoalForm.controls;
  }

  async onSubmitForm() {
    this.submitInProgress = true
    const formValue = this.updateDonationGoalForm.value;
    const result = await this._donationDatastoreService.updateDonationGoal(this.memorialId, formValue['amount'], formValue['message']);
    if (result) {
      this._modalDatastoreService.close(ModalNameEnum.UpdateGoalDonation, ModalStateEnum.ClosedAndRefreshed);
    }
    this.submitInProgress = false
  }
}
