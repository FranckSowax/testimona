import { Component, Input, OnInit } from '@angular/core';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { FuneralEventCreateModel } from '../../models/funeral-event-create.model';
import { ListSortOrderEnum } from 'src/app/shared/enums/list-sort-order.enum';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { DatePipe } from '@angular/common'

@Component({
  selector: 'app-create-funeral-event',
  templateUrl: './create-funeral-event.component.html',
  styleUrls: ['./create-funeral-event.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    },
    DatePipe
  ],
})

export class CreateFuneralEventComponent implements OnInit {
  @Input('memorialId') memorialId: number;

  public loadingDone: boolean = true;
  public assetUrl = environment.assetUrl;
  private subscriptions = new Subscription();
  public errorCreateFuneralEvent: string;
  public hourList = DateHelpers.getHourDropDownList(0, 23, ListSortOrderEnum.ascending, true, 1, false);
  public minuteList = DateHelpers.getNumberDropDownList(0, 59, ListSortOrderEnum.ascending, true, 5);
  createFuneralEventForm: UntypedFormGroup = new UntypedFormGroup({});
  public period: string;

  constructor(
    private funeralDatastoreService: FuneralDatastoreService,
    private modalDatastoreService: ModalDatastoreService,
    private translocoService: TranslocoService, 
    private formBuilder: UntypedFormBuilder,
    public datepipe: DatePipe
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.funeralDatastoreService.ErrorFuneralDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateFuneralEvent = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
              this.errorCreateFuneralEvent = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateFuneralEvent = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this.initForm();
    this.loadingDone = true;
  }

  initForm() {
    this.createFuneralEventForm = this.formBuilder.group({
      title: ['', Validators.required],
      date: ['', Validators.required],
      startHour: ['', Validators.required],
      startMinute: ['', Validators.required],
      endHour: ['', Validators.required],
      endMinute: ['', Validators.required],
      url: [''],
      note: [''],
      location: [''],
    });
  }

  get formControls() {
    return this.createFuneralEventForm.controls;
  }

  async onSubmitForm() {
    const formValue = this.createFuneralEventForm.value;

    const startHourSplit = formValue['startHour'].split(' ');
    const endHourSplit = formValue['endHour'].split(' ');

    const newFuneralEvent = new FuneralEventCreateModel(
      this.memorialId,
      formValue['title'],
      this.datepipe.transform(formValue['date'], 'yyyy/MM/dd'),
      `${startHourSplit[0]}:${this.minuteFormat(formValue['startMinute'])}`,
      startHourSplit[1],
      `${endHourSplit[0]}:${this.minuteFormat(formValue['endMinute'])}`,
      endHourSplit[1],
      formValue['url'],
      formValue['note'],
      formValue['location'],
      );

    const result = await this.funeralDatastoreService.createEventFuneral(newFuneralEvent, this.memorialId);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.CreateFuneralEvent, ModalStateEnum.ClosedAndRefreshed);
    }
  }

  minuteFormat(minute: string) {
    if (minute.length == 1) {
      return `0${minute}`
    }
    return minute
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateFuneralEvent, modalState);
  }

}
