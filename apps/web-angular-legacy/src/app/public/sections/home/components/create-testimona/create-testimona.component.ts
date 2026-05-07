import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { TranslocoService, TRANSLOCO_SCOPE } from '@ngneat/transloco';
import { find } from 'lodash-es';
import { Subject, Subscription } from 'rxjs';
import { AppShellService } from 'src/app/core/services/app-shell.service';
import { ConfigurationDatastoreService } from 'src/app/shared/datastores/configuration.datastore.service';
import { ModalDatastoreService } from 'src/app/shared/datastores/modal.datastore.service';
import { SearchDatastoreService } from 'src/app/shared/datastores/search.datastore.service';
import { ApiResultResponseEnum } from 'src/app/shared/enums/api-error-response.enum';
import { ListSortOrderEnum } from 'src/app/shared/enums/list-sort-order.enum';
import { ModalNameEnum, ModalStateEnum } from 'src/app/shared/enums/modal.enum';
import { RelativesEnum } from 'src/app/shared/enums/relatives.enum';
import { SearchParentSourceEnum } from 'src/app/shared/enums/search-parent-source.enum';
import { DateHelpers } from 'src/app/shared/helpers/date.helper';
import { EnumHelpers } from 'src/app/shared/helpers/enum.helper';
import { CountryMemorialModel } from 'src/app/shared/models/country-memorial.model';
import { KeyValuePairModel } from 'src/app/shared/models/key-value-pair.model';
import { MemorialSearchResultModel } from 'src/app/shared/models/memorial-search.model';
import { UploadObjectType } from 'src/app/shared/models/upload-media.model';
import { environment } from 'src/environments/environment';
import { PhotoDatastoreService } from '../../../photo/services/photo-datastore.service';
import { MemorialSearchModel } from '../../../testimona/models/memorial-search.model';
import { TestimonaModel } from '../../../testimona/models/testimona.model';
import { MemorialCreateModel } from '../../models/memorial.model';
import { TestimonaCreateModel } from '../../models/testimona-create.model';
import { TestimonaDatastoreService } from '../../services/testimona.datastore.service';


@Component({
  selector: 'app-home-testimona',
  templateUrl: './create-testimona.component.html',
  styleUrls: ['./create-testimona.component.scss'],
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: { scope: 'testimona' }
    }
  ],
})
export class HomeTestimonaCreateComponent implements OnInit, OnDestroy {
  @ViewChild('countryOfDeathSelect', { static: false }) countryOfDeathSelect: ElementRef<HTMLSelectElement>;
  @ViewChild('panelResult', { static: false }) panelResult: MatExpansionPanel;

  public createTestimonaForm: UntypedFormGroup = new UntypedFormGroup({});

  public errorCreateTestimona: string;
  public errorSearchByCriteria: string;

  public assetUrl = environment.assetUrl;
  public searchParentSourceEnum = SearchParentSourceEnum;
  public memorialUrl: string;
  public relatives = new Array<KeyValuePairModel>();
  public createInProgress: boolean = false;
  public divMemorial: boolean = false;
  public formData = new FormData();
  public result: TestimonaModel;
  public countries = new Array<CountryMemorialModel>();
  public yearList = DateHelpers.getNumberDropDownList(1500, new Date().getFullYear(), ListSortOrderEnum.descending);
  public headerPanelTitle: string;

  public searchResult: MemorialSearchResultModel[] = null;
  private _subscription = new Subscription();

  public maximumFiles = 2;
  public acceptedFiles = 'image/png, image/jpeg';
  private searchObjectMemorial$ = new Subject<MemorialSearchModel>();
  private numberOfResult: number = 7;

  private memorialId: number;
  private subscriptions = new Subscription();
  private fileToUpload: Array<File> = new Array<File>();

  get formControls() {
    return this.createTestimonaForm.controls;
  }

  constructor(
    private translocoService: TranslocoService,
    private testimonaDatastoreService: TestimonaDatastoreService,
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private appShellService: AppShellService,
    private configurationDatastoreService: ConfigurationDatastoreService,
    private modalDatastoreService: ModalDatastoreService,
    private photoDatastoreService: PhotoDatastoreService,
    private searchDatastoreService: SearchDatastoreService
    ) { }

  ngOnInit(): void {
    this.headerPanelTitle = `${this.translocoService.translate('site.memorial.select_memorial')} (0 ${this.translocoService.translate('site.memorial.result')})`;
    const relativeTranslation = this.translocoService.translateObject("relatives");
    this.relatives = EnumHelpers.getEnumDropDownList(RelativesEnum, relativeTranslation);
    this.getCountries(this.appShellService.getActiveLanguage());

    (async () => {
      const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(this.appShellService.getActiveLanguage());
      if (!memorialConfiguration) return;

      this._subscription.add(
        this.searchDatastoreService.searchMemorialByCriteria(this.searchObjectMemorial$, this.numberOfResult, memorialConfiguration.countries)
          .subscribe((result: MemorialSearchResultModel[] | []) => {
            const searchResultCount = result == null ? 0 : result.length;
            this.headerPanelTitle = `${this.translocoService.translate('site.memorial.select_memorial')} (${searchResultCount} ${this.translocoService.translate('site.memorial.result')})`;
            this.searchResult = result;
        })
      );
    })();

    this.subscriptions.add(
      this.testimonaDatastoreService.ErrorTestimonaDatastore$.subscribe((errorResult) => {
        if (errorResult != ApiResultResponseEnum.NoError) {
          this.errorCreateTestimona = '';
          switch (errorResult) {
            case ApiResultResponseEnum.MissingParameter:
            case ApiResultResponseEnum.InvalidParameter:
            case ApiResultResponseEnum.InvalidBodyData:
            case ApiResultResponseEnum.MemorialNotExist:
            case ApiResultResponseEnum.CreateTestimonialByMemorialIdFailed:
              this.errorCreateTestimona = this.translocoService.translate('error.api');
              break;
            default:
              this.errorCreateTestimona = this.translocoService.translate('error.api');
              break;
          }
        }
      })
    );

    this.initForm();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initForm() {
    this.createTestimonaForm = this.formBuilder.group({
      memorialId: [''],
      content: ['', Validators.required],
      relatives: ['', Validators.required],
      firstname: [''],
      lastname: [''],
      yearOfDeath: [{ value: '', disabled: true }],
      countryOfDeath: [{ value: '', disabled: true }]
    });
  }

  searchByCriteria(): void {
    this.searchResult = null;
    const formValue = this.createTestimonaForm.value;

    if (formValue["firstname"]?.trim() != "" || formValue["lastname"]?.trim() != "") {
      this.createTestimonaForm.controls["yearOfDeath"].enable();
      this.createTestimonaForm.controls["countryOfDeath"].enable();
    }

    this.panelResult.close();
    this.headerPanelTitle = `${this.translocoService.translate('site.memorial.select_memorial')} (0 ${this.translocoService.translate('site.memorial.result')})`;
    this.searchObjectMemorial$.next(new MemorialSearchModel(
      formValue["firstname"]?.trim(),
      formValue["lastname"]?.trim(),
      formValue["yearOfDeath"]?.trim(),
      formValue["countryOfDeath"]?.trim()
    ));
    this.panelResult.open();
  }

  uploadOnChange(event: { files: { toAdd: File[], toDelete: string[] } }): void {
    this.fileToUpload = event.files.toAdd;
  }

  async onSubmitForm() {
    this.createInProgress = true;
    const formValue = this.createTestimonaForm.value;

    const newTestimona = new TestimonaCreateModel(
      formValue['content'],
      RelativesEnum[formValue['relatives']],
    );

    if (this.memorialId) {
      this.result = await this.testimonaDatastoreService.createTestimona(this.memorialId, newTestimona);
    } else {
      const newMemorial = new MemorialCreateModel(
        formValue['firstname'],
        formValue['lastname'],
        formValue['yearOfDeath'],
        0,
        0,
        "",
        this.countryOfDeathSelect.nativeElement.value,
        "",
        RelativesEnum[formValue['relatives']],
        true
      );
      const newMemorialResult = await this.testimonaDatastoreService.createMemorial(newMemorial);
      this.result = await this.testimonaDatastoreService.createTestimona(newMemorialResult.id, newTestimona);
      this.memorialUrl = newMemorialResult.url;
    }

    if (this.result && this.result.id > 0) {
      if (this.fileToUpload.length == 0) {
        this.reset();
        this.closeModal(ModalStateEnum.ClosedAndRefreshed);
        this.router.navigate(["memorial", this.memorialUrl]);
        return;
      }
      const resultAddPhotos = await this.addPhoto(this.result.id);
      if (resultAddPhotos) {
        this.createInProgress = true;
        this.reset();
        this.closeModal(ModalStateEnum.ClosedAndRefreshed);
        this.router.navigate(["memorial", this.memorialUrl]);
        return;
      } else {
        this.createInProgress = true;
        this.router.navigate(["memorial", this.memorialUrl])
        return;
      }
    }
  }

  private async addPhoto(testimonaId: number): Promise<boolean> {
    this.formData.append('objectId', testimonaId.toString());
    this.formData.append('objectType', UploadObjectType.Testimonial);

    if (this.fileToUpload.length > 1) {
      for (let i = 0; i < this.fileToUpload.length; i++) {
        this.formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
        this.formData.append('file', this.fileToUpload[i]);
      };
    } else {
      this.formData.append('previousFilesData', JSON.stringify({ previousName: '' }));
      this.formData.append('file', this.fileToUpload[0])
    }

    const newObjectPhoto = await this.photoDatastoreService.createPhoto(this.formData);
    if (newObjectPhoto) {
      return Promise.resolve(newObjectPhoto.length == this.fileToUpload.length);
    }
    return Promise.resolve(false);
  }

  closeModal(modalState?: ModalStateEnum) {
    this.modalDatastoreService.close(ModalNameEnum.CreateTestimonaHome, modalState);
  }

  private reset() {
    this.createTestimonaForm.controls['content'].setValue('');
  }

  private async getCountries(currentLang: string) {
    const memorialConfiguration = await this.configurationDatastoreService.memorialConfiguration(currentLang);
    if (!memorialConfiguration) return;

    this.countries = memorialConfiguration.countries.sort((a, b) => a.code.localeCompare(b.code));
  }

  memorialOnClick(item: MemorialSearchResultModel): void {
    this.memorialId = item.id;
    this.memorialUrl = item.url;

    this.createTestimonaForm.controls['firstname'].setValue(item.firstname);
    this.createTestimonaForm.controls['lastname'].setValue(item.lastname);
    this.createTestimonaForm.controls['yearOfDeath'].setValue(item.yearOfDeath);

    const countryId = find(this.countries, (c) => c.code.toLowerCase() == item.countryOfDeath.toLowerCase());
    this.createTestimonaForm.controls['countryOfDeath'].setValue(countryId.id);

    this.headerPanelTitle = `${item.firstname} ${item.lastname}, ${item.countryOfDeath} ${item.yearOfDeath}`;
  }
}
