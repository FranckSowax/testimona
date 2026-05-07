import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { MemorialCreateModel } from '../../models/memorial-create.model'
import { MemorialDatastoreService } from '../../services/memorial-datastore.service'
import { TranslocoService } from '@ngneat/transloco';
import { RelativesEnum } from '../../../../../shared/enums/relatives.enum'
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { ModalNameEnum } from 'src/app/shared/enums/modal.enum';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { ListSortOrderEnum } from 'src/app/shared/enums/list-sort-order.enum';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { Subscription } from 'rxjs';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';

@Component({
  selector: 'app-create-memorial',
  templateUrl: './create-memorial.component.html',
  styleUrls: ['./create-memorial.component.scss']
})
export class MemorialCreateComponent implements OnInit {
  @ViewChild('countryOfDeathSelect', { static: false }) countryOfDeathSelect: ElementRef<HTMLSelectElement>;

  createMemorialForm: UntypedFormGroup = new UntypedFormGroup({});
  public relatives = new Array<KeyValuePairModel>();
  public countries = new Array<CountryMemorialModel>();
  public yearList = DateHelpers.getNumberDropDownList(1500, new Date().getFullYear(), ListSortOrderEnum.descending);
  public monthList = DateHelpers.getNumberDropDownList(1, 12, ListSortOrderEnum.ascending);
  public dayList = DateHelpers.getNumberDropDownList(1, 31, ListSortOrderEnum.ascending);
  private subscriptions = new Subscription();
  public errorCreateMemorial: string;
  public createInProgress: boolean = false;


  public assetUrl = environment.assetUrl;
  public displayIsAdminCheckbox: boolean;

  get formControls() {
    return this.createMemorialForm.controls;
  }

  constructor(
    private configurationDatastoreService: ConfigurationDatastoreService,
    private formBuilder: UntypedFormBuilder,
    private memorialDatastoreService : MemorialDatastoreService,
    private translocoService: TranslocoService,
    private appShellService: AppShellService,
    private modalDatastoreService: ModalDatastoreService,
    private router: Router
    ) { }

  ngOnInit(): void {
    const relativeTranslation = this.translocoService.translateObject("relatives");
    this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);

    this.getCountries(this.appShellService.getActiveLanguage());
    this.subscriptions.add(
      this.memorialDatastoreService.ErrorMemorialDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.createInProgress = false;
          this.errorCreateMemorial = '';
          switch(errorResult) {
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.DataAlreadyExists:
            case ApiResultResponseEnum.CreateMemorialFailed:
              this.errorCreateMemorial = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateMemorial = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );
    this.initForm();
  }

  initForm() {
    this.createMemorialForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      yearOfDeath: ['', [Validators.required, Validators.pattern("[0-9]{4}")]],
      monthOfDeath: [Validators.pattern("^[0-9]{2}")],
      dayOfDeath: [Validators.pattern("^[0-9]{2}")],
      countryOfDeath: ['', Validators.required],
      cityOfDeath: [''],
      isAdmin: [''],
      shortBiography: [''],
      relatives: ['', Validators.required],
      image: ['']
    });
    // TO KEEP IF THEY CHANGE THEIR MIND ON WHO HAS THE RIGHT TO WRITE A BIOGRAPHY
    // this.createMemorialForm.controls['shortBiography'].disable()
  }

  async onSubmitForm() {
    const formValue = this.createMemorialForm.value;

    const newMemorial = new MemorialCreateModel(
      formValue['firstname'],
      formValue['lastname'],
      formValue['yearOfDeath'],
      formValue['monthOfDeath'],
      formValue['dayOfDeath'],
      formValue['cityOfDeath'],
      this.countryOfDeathSelect.nativeElement.value,
      formValue['shortBiography'],
      RelativesEnum[formValue['relatives']],
      true
      // (!formValue['isAdmin'].value || formValue['isAdmin'].value == '') ? false : formValue['isAdmin'].value
    );
    await this.createMemorialApi(newMemorial);
  }

  async createMemorialApi(newCreateMemorial: MemorialCreateModel) {
    this.createInProgress = true;
      const newMemorial = await this.memorialDatastoreService.createMemorial(newCreateMemorial);
      if(newMemorial && newMemorial.id > 0) {
        this.createInProgress = false;
        this.closeModal();
        this.router.navigate(["memorial", newMemorial.url])
      }
  }

  private async getCountries(currentLang: string) {
    const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(currentLang);
    if(!memorialConfiguration) return;

    this.countries = memorialConfiguration.countries.sort((a, b) => a.code.localeCompare(b.code));
  }

  closeModal() {
    this.modalDatastoreService.close(ModalNameEnum.CreateMemorial);
  }
}
