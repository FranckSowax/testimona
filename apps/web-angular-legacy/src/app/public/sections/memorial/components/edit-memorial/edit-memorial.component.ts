import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { combineLatest, Subscription } from 'rxjs';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { MemorialDatastoreService } from "src/app/public/sections/memorial/services/memorial-datastore.service"
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum'
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { ListSortOrderEnum } from 'src/app/shared/enums/list-sort-order.enum';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { MemorialEditModel } from '../../models/memorial-edit.model';
import { MemorialModel } from '../../models/memorial.model';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';

@Component({
  selector: 'app-edit-memorial',
  templateUrl: './edit-memorial.component.html',
  styleUrls: ['./edit-memorial.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'memorial' }
    }
  ],
})
export class MemorialEditComponent implements OnInit {
  @Input('memorialUrl') memorialUrl: string;

  @ViewChild('countryOfDeathSelect', { static: false }) public countryOfDeathSelect: ElementRef<HTMLSelectElement>;
  @ViewChild('countryOfBirthSelect', { static: false }) public countryOfBirthSelect: ElementRef<HTMLSelectElement>;

  editMemorialForm: UntypedFormGroup = new UntypedFormGroup({});
  public displayIsAdminCheckbox: boolean;
  public assetUrl = environment.assetUrl;
  public relatives = new Array<KeyValuePairModel>();
  public countries = new Array<CountryMemorialModel>();
  public editMemorialItem: MemorialModel;
  public countryOfDeathMemorial: string;
  public countryOfDeathCode: number;
  public countryOfBirthMemorial: string;
  public countryOfBirthCode: number;
  public loadingDone: boolean = false;
  private subscriptions = new Subscription();


  public yearList = DateHelpers.getNumberDropDownList(1500, new Date().getFullYear(), ListSortOrderEnum.descending);
  public monthList = DateHelpers.getNumberDropDownList(1, 12, ListSortOrderEnum.ascending);
  public dayList = DateHelpers.getNumberDropDownList(1, 31, ListSortOrderEnum.ascending);
  public errorEditMemorial: string;

  get formControls() {
    return this.editMemorialForm.controls;
  }

  constructor(
    private modalDatastoreService: ModalDatastoreService,
    private translocoService: TranslocoService,
    private configurationDatastoreService: ConfigurationDatastoreService,
    private memorialDatastoreService: MemorialDatastoreService,
    private appShellService: AppShellService,
    private formBuilder: UntypedFormBuilder) { }


  ngOnInit(): void {
    (async () => {
      const relativeTranslation = this.translocoService.translateObject("relatives");
      this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);

      const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(this.appShellService.getActiveLanguage());
      this.countries = memorialConfiguration.countries.sort((a, b) => a.code.localeCompare(b.code));
      combineLatest([
        this.memorialDatastoreService.getMemorial(this.memorialUrl),
        this.translocoService.load(`countries/${this.appShellService.getActiveLanguage()}`),
      ])
      .subscribe(([memorialItem, countriesData]) => {
        this.countryOfDeathMemorial = countriesData[memorialItem.countryOfDeath.code];
        this.countryOfDeathCode = memorialItem.countryOfDeath.id;
        this.countryOfBirthMemorial = countriesData[memorialItem.countryOfBirth.code];
        this.countryOfBirthCode = memorialItem.countryOfBirth.id;
        this.editMemorialItem = memorialItem;
        this.initForm(memorialItem);
        this.loadingDone = true;
      },
      (err) => {
        console.log(err);
        this.loadingDone = true;
      });
    })();

    this.subscriptions.add(
      this.memorialDatastoreService.ErrorMemorialDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorEditMemorial = '';
          switch(errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.DataNotFound:
            case ApiResultResponseEnum.UpdateMemorialFailed:
              this.errorEditMemorial = this.translocoService.translate('error.api');
              break;
            default:
              this.errorEditMemorial = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

  }

  async initForm(displayedMemorial: MemorialModel) {
    this.editMemorialForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      yearOfBirth: ['', [Validators.pattern("[0-9]{4}")]],
      monthOfBirth: ['', [Validators.pattern("^[0-9]{2}")]],
      dayOfBirth: ['', [Validators.pattern("^[0-9]{2}")]],
      countryOfBirth: [''],
      cityOfBirth: [''],
      yearOfDeath: ['', [Validators.required, Validators.pattern("[0-9]{4}")]],
      monthOfDeath: ['', [Validators.pattern("^[0-9]{2}")]],
      dayOfDeath: ['', [Validators.pattern("^[0-9]{2}")]],
      countryOfDeath: ['', Validators.required],
      cityOfDeath: [''],
      isAdmin: [''],
      shortBiography: [''],
      relatives: ['', Validators.required],
      image: ['']
    });

    this.editMemorialForm.controls['firstname'].setValue(displayedMemorial.firstname);
    this.editMemorialForm.controls['lastname'].setValue(displayedMemorial.lastname);
    this.editMemorialForm.controls['yearOfDeath'].setValue(displayedMemorial.yearOfDeath == 0 ? "" : displayedMemorial.yearOfDeath.toString());
    this.editMemorialForm.controls['monthOfDeath'].setValue(displayedMemorial.monthOfDeath == 0 ? "" : displayedMemorial.monthOfDeath.toString());
    this.editMemorialForm.controls['dayOfDeath'].setValue(displayedMemorial.dayOfDeath == 0 ? "" : displayedMemorial.dayOfDeath.toString());
    this.editMemorialForm.controls['countryOfDeath'].setValue(this.countryOfDeathCode == null ? "" : this.countryOfDeathCode);
    this.editMemorialForm.controls['cityOfDeath'].setValue(displayedMemorial.cityOfDeath);
    this.editMemorialForm.controls['shortBiography'].setValue(displayedMemorial.shortBiography);
    this.editMemorialForm.controls['yearOfBirth'].setValue(displayedMemorial.yearOfBirth == 0 ? "" : displayedMemorial.yearOfBirth.toString());
    this.editMemorialForm.controls['monthOfBirth'].setValue(displayedMemorial.monthOfBirth == 0 ? "" : displayedMemorial.monthOfBirth.toString());
    this.editMemorialForm.controls['dayOfBirth'].setValue(displayedMemorial.dayOfBirth == 0 ? "" : displayedMemorial.dayOfBirth.toString());
    this.editMemorialForm.controls['countryOfBirth'].setValue(this.countryOfBirthCode == null ? "" : this.countryOfBirthCode);
    this.editMemorialForm.controls['cityOfBirth'].setValue(displayedMemorial.cityOfBirth);
  }

  async onSubmitForm() {
    const formValue = this.editMemorialForm.value;
    const editedMemorial = new MemorialEditModel(
      formValue['firstname'],
      formValue['lastname'],
      formValue['yearOfBirth'] == "" ? "0" : formValue['yearOfBirth'] ,
      formValue['monthOfBirth'] == "" ? "0" : formValue['monthOfBirth'],
      formValue['dayOfBirth'] == "" ? "0" : formValue['dayOfBirth'],
      this.countryOfBirthSelect.nativeElement.value == "" ? "0" : this.countryOfBirthSelect.nativeElement.value,
      formValue['cityOfBirth'],
      formValue['yearOfDeath'],
      formValue['monthOfDeath'] == "" ? "0" : formValue['monthOfDeath'] ,
      formValue['dayOfDeath'] == "" ? "0" : formValue['dayOfDeath'] ,
      this.countryOfDeathSelect.nativeElement.value,
      formValue['cityOfDeath'],
      formValue['shortBiography']
    );

    const result = await this.memorialDatastoreService.editMemorial(this.editMemorialItem.id, editedMemorial);
    if (result && result != true) {
      this.closeModal();
    }

    this.closeModal(ModalStateEnum.ClosedAndRefreshed);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.EditMemorial, modalState);
  }

  // onChangeRelative() {
  //   let relativeValue = this.editMemorialForm.controls['relatives'].value;
  //   if (relativeValue == 0 || relativeValue == 1 || relativeValue == 2 || relativeValue == 3 || relativeValue == 4) {
  //     this.editMemorialForm.controls['shortBiography'].enable();
  //     this.displayIsAdminCheckbox = true;
  //   } else {
  //     this.editMemorialForm.controls['shortBiography'].disable();
  //     this.displayIsAdminCheckbox = false;
  //   }
  // }
}
