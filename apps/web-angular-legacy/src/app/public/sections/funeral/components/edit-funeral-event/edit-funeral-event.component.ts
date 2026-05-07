import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { Subscription } from 'rxjs';
import { FuneralDatastoreService } from '../../services/funeral-datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { FuneralEventGetModel } from '../../models/funeral-event-get.model';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { ListSortOrderEnum } from 'src/app/shared/enums/list-sort-order.enum';
import { DatePipe } from '@angular/common';
import { FuneralEventEditModel } from '../../models/funeral-event-edit.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-edit-funeral-event',
  templateUrl: './edit-funeral-event.component.html',
  styleUrls: ['./edit-funeral-event.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'funeral' }
    },
    DatePipe
  ],
})
export class EditFuneralEventComponent implements OnInit, OnChanges {
  @Input('funeralEventId') funeralEventId: number;

  private subscriptions = new Subscription();
  public errorEditFuneralEvent: string;
  editFuneralEventForm: UntypedFormGroup = new UntypedFormGroup({});
  public loadingDone: boolean = false;
  public funeralEvent: FuneralEventGetModel;
  public hourList = DateHelpers.getHourDropDownList(0, 23, ListSortOrderEnum.ascending, true, 1, false);
  public minuteList = DateHelpers.getNumberDropDownList(0, 59, ListSortOrderEnum.ascending, true, 5);
  public assetUrl = environment.assetUrl;

  constructor(
    private translocoService: TranslocoService,
    private funeralDatastoreService: FuneralDatastoreService,
    private formBuilder: UntypedFormBuilder,
    private modalDatastoreService: ModalDatastoreService,
    public datepipe: DatePipe
  ) { }

  async ngOnInit(): Promise<void> {
    this.subscriptions.add(
      this.funeralDatastoreService.ErrorFuneralDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorEditFuneralEvent = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.FuneralEventNotExist:
            case ApiResultResponseEnum.UpdateFuneralEventFailed:
              this.errorEditFuneralEvent = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditFuneralEvent = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await this.getFuneralEvent();
  }


  async getFuneralEvent() {
    if (this.funeralEventId > 0) {
      this.funeralDatastoreService.getFuneralEvent(this.funeralEventId).subscribe((funeralEvent) => {
        this.funeralEvent = funeralEvent;
        this.loadingDone = true;
        this.initForm(this.funeralEvent);
      });
    }
    this.loadingDone = true
    // Ici afficher message d'erreur
  }

  initForm(funeralEvent: FuneralEventGetModel) {
    this.editFuneralEventForm = this.formBuilder.group({
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

    this.editFuneralEventForm.controls['title'].setValue(funeralEvent.title);
    this.editFuneralEventForm.controls['date'].setValue(this.datepipe.transform(funeralEvent.date, "yyyy-MM-dd"));
    const startTime = funeralEvent.startHour.split(":",2)
    this.editFuneralEventForm.controls['startHour'].setValue(`${startTime[0]} ${funeralEvent.startPeriod}`);
    this.editFuneralEventForm.controls['startMinute'].setValue(startTime[1].toString());
    const endTime = funeralEvent.endHour.split(":", 2)
    this.editFuneralEventForm.controls['endHour'].setValue(`${endTime[0]} ${funeralEvent.endPeriod}`);
    this.editFuneralEventForm.controls['endMinute'].setValue(endTime[1].toString());
    this.editFuneralEventForm.controls['url'].setValue(funeralEvent.url);
    this.editFuneralEventForm.controls['note'].setValue(funeralEvent.note);
    this.editFuneralEventForm.controls['location'].setValue(funeralEvent.location);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditFuneralEvent, modalState);
  }

  async onSubmitForm() {
    const formValue = this.editFuneralEventForm.value;

    const startHourSplit = formValue['startHour'].split(' ');
    const endHourSplit = formValue['endHour'].split(' ');

    const editedFuneralEvent = new FuneralEventEditModel(
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

    const result = await this.funeralDatastoreService.editFuneralEvent(this.funeralEventId, editedFuneralEvent);
    if (result) {
      this.modalDatastoreService.close(ModalNameEnum.EditFuneralEvent, ModalStateEnum.ClosedAndRefreshed);
    }
  }

  minuteFormat(minute: string) {
    if (minute.length == 1) {
      return `0${minute}`
    }
    return minute
  }
}
